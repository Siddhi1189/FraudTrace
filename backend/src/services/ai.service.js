import { AIBrief, ANALYST_DECISIONS } from '../models/aiBrief.model.js';
import { Case } from '../models/case.model.js';
import { CaseEvent } from '../models/caseEvent.model.js';
import { buildCaseEvidenceSnapshot } from './evidence/evidenceBuilder.js';
import { generateEvidenceHash } from './evidence/evidenceHasher.js';
import { executeAiQuery } from './ai/llmClient.js';
import { verifyAiOutput } from './ai/aiVerifier.js';
import {
  generateDeterministicBrief,
  answerQuestionDeterministically,
} from './ai/deterministicFallback.js';
import { emitSocketEvent } from '../socket/index.js';

/**
 * Creates an AI investigation brief for a case.
 *
 * @param {Object} params
 * @param {string} params.caseId - ObjectId of the case
 * @param {string} params.userId - ObjectId of the requesting analyst
 * @returns {Promise<Object>} Created AIBrief document
 */
export async function createBrief({ caseId, userId }) {
  if (!caseId) {
    const error = new Error('Case ID is required');
    error.statusCode = 400;
    throw error;
  }

  // 1. Validate case exists
  const caseRecord = await Case.findById(caseId);
  if (!caseRecord) {
    const error = new Error(`Case not found: ${caseId}`);
    error.statusCode = 404;
    throw error;
  }

  // 2. Gather permitted investigation evidence & build canonical snapshot
  const evidenceSnapshot = await buildCaseEvidenceSnapshot(caseId);

  // 3. Generate deterministic evidence hash
  const evidenceHash = generateEvidenceHash(evidenceSnapshot);

  // 4. Call configured LLM or deterministic fallback
  const { structuredOutput, model, promptVersion, isFallback } = await executeAiQuery({
    type: 'BRIEF',
    evidenceSnapshot,
  });

  // 5. Verify structured response against evidence snapshot
  const { verificationStatus, verificationErrors } = verifyAiOutput(
    structuredOutput,
    evidenceSnapshot,
    isFallback
  );

  let finalOutput = structuredOutput;
  let finalModel = model;
  let finalStatus = verificationStatus;

  // I6: If UNVERIFIED, persist deterministic fallback as shown output with rejection errors in verificationErrors
  if (verificationStatus === 'UNVERIFIED') {
    finalOutput = generateDeterministicBrief(evidenceSnapshot);
    finalModel = 'deterministic-fallback';
    finalStatus = 'FALLBACK';
  } else if (verificationStatus === 'PARTIALLY_VERIFIED') {
    // Filter out unverified findings before display (I6)
    const catalog = evidenceSnapshot.evidenceCatalog || [];
    const validEvidenceIds = new Set(catalog.map((i) => i.id));
    if (Array.isArray(finalOutput?.findings)) {
      finalOutput = {
        ...finalOutput,
        findings: finalOutput.findings.filter((f) => {
          const citedIds = Array.isArray(f.evidenceIds) ? f.evidenceIds : [];
          return citedIds.length > 0 && citedIds.every((id) => validEvidenceIds.has(id));
        }),
      };
    }
  }

  // 6. Persist AIBrief
  const brief = await AIBrief.create({
    caseId,
    kind: 'INVESTIGATION_BRIEF',
    question: null,
    evidenceSnapshot,
    evidenceHash,
    structuredOutput: finalOutput,
    verificationStatus: finalStatus,
    verificationErrors,
    model: finalModel,
    promptVersion,
    analystDecision: 'PENDING',
    editedText: null,
    createdAt: new Date(),
  });

  // 7. Audit event: AI_BRIEF_GENERATED
  await CaseEvent.create({
    caseId,
    eventType: 'AI_BRIEF_GENERATED',
    metadata: {
      briefId: brief._id,
      kind: brief.kind,
      model: finalModel,
      verificationStatus: finalStatus,
      evidenceHash,
    },
    createdBy: userId || null,
    createdAt: new Date(),
  });

  // 8. Realtime event: ai-completed
  emitSocketEvent('ai-completed', {
    caseId: caseId.toString(),
    briefId: brief._id.toString(),
    kind: brief.kind,
  });

  return brief;
}

/**
 * Returns a persisted AI brief by its ID.
 *
 * @param {string} id - AIBrief ObjectId
 * @returns {Promise<Object>} Persisted AIBrief
 */
export async function getBriefById(id) {
  const brief = await AIBrief.findById(id).lean();
  if (!brief) {
    const error = new Error(`AI Brief not found: ${id}`);
    error.statusCode = 404;
    throw error;
  }
  return brief;
}

/**
 * Updates an AI brief for analyst review / editing.
 * Strictly prevents mutation of provenance fields (evidenceHash, evidenceSnapshot, model, verification results).
 *
 * @param {string} id - AIBrief ObjectId
 * @param {Object} updates
 * @param {string} [updates.analystDecision] - 'PENDING' | 'ACCEPTED' | 'EDITED' | 'DISCARDED'
 * @param {string} [updates.editedText] - Analyst-edited prose
 * @param {string} userId - Requesting analyst ID
 * @returns {Promise<Object>} Updated AIBrief
 */
export async function updateBrief(id, { analystDecision, editedText }, userId) {
  const brief = await AIBrief.findById(id);
  if (!brief) {
    const error = new Error(`AI Brief not found: ${id}`);
    error.statusCode = 404;
    throw error;
  }

  // Validate analystDecision if provided
  if (analystDecision !== undefined) {
    if (!ANALYST_DECISIONS.includes(analystDecision)) {
      const error = new Error(
        `Invalid analystDecision: ${analystDecision}. Allowed: ${ANALYST_DECISIONS.join(', ')}`
      );
      error.statusCode = 400;
      throw error;
    }
    brief.analystDecision = analystDecision;
  }

  // Update editedText if provided
  if (editedText !== undefined) {
    brief.editedText = editedText === null ? null : String(editedText);
    if (brief.analystDecision === 'PENDING') {
      brief.analystDecision = 'EDITED';
    }
  }

  await brief.save();

  // Audit event: AI_BRIEF_EDITED or AI_BRIEF_DECIDED
  const eventType = analystDecision ? 'AI_BRIEF_DECIDED' : 'AI_BRIEF_EDITED';
  await CaseEvent.create({
    caseId: brief.caseId,
    eventType,
    metadata: {
      briefId: brief._id,
      analystDecision: brief.analystDecision,
      hasEditedText: !!brief.editedText,
    },
    createdBy: userId || null,
    createdAt: new Date(),
  });

  return brief;
}

/**
 * Answers a case-specific investigation question grounded in case evidence.
 *
 * @param {string} caseId - ObjectId of the case
 * @param {Object} params
 * @param {string} params.question - Analyst's query
 * @param {string} params.userId - Requesting analyst ID
 * @returns {Promise<Object>} Created AIBrief containing grounded answer
 */
export async function askCaseQuestion(caseId, { question, userId }) {
  if (!caseId) {
    const error = new Error('Case ID is required');
    error.statusCode = 400;
    throw error;
  }

  if (!question || typeof question !== 'string' || !question.trim()) {
    const error = new Error('Investigation question cannot be empty');
    error.statusCode = 400;
    throw error;
  }

  const caseRecord = await Case.findById(caseId);
  if (!caseRecord) {
    const error = new Error(`Case not found: ${caseId}`);
    error.statusCode = 404;
    throw error;
  }

  // 1. Build canonical evidence snapshot
  const evidenceSnapshot = await buildCaseEvidenceSnapshot(caseId);

  // 2. Generate deterministic evidence hash
  const evidenceHash = generateEvidenceHash(evidenceSnapshot);

  // 3. Execute QA query through LLM or fallback
  const { structuredOutput, model, promptVersion, isFallback } = await executeAiQuery({
    type: 'QA',
    evidenceSnapshot,
    question: question.trim(),
  });

  // 4. Verify answer against evidence snapshot
  const { verificationStatus, verificationErrors } = verifyAiOutput(
    structuredOutput,
    evidenceSnapshot,
    isFallback
  );

  let finalOutput = structuredOutput;
  let finalModel = model;
  let finalStatus = verificationStatus;

  // I6: If UNVERIFIED, persist deterministic fallback as shown output
  if (verificationStatus === 'UNVERIFIED') {
    finalOutput = answerQuestionDeterministically(question.trim(), evidenceSnapshot);
    finalModel = 'deterministic-fallback';
    finalStatus = 'FALLBACK';
  }

  // 5. Persist AIBrief
  const brief = await AIBrief.create({
    caseId,
    kind: 'CASE_QA',
    question: question.trim(),
    evidenceSnapshot,
    evidenceHash,
    structuredOutput: finalOutput,
    verificationStatus: finalStatus,
    verificationErrors,
    model: finalModel,
    promptVersion,
    analystDecision: 'PENDING',
    editedText: null,
    createdAt: new Date(),
  });

  // 6. Audit event: AI_QUESTION_ASKED
  await CaseEvent.create({
    caseId,
    eventType: 'AI_QUESTION_ASKED',
    metadata: {
      briefId: brief._id,
      question: question.trim(),
      verificationStatus: finalStatus,
    },
    createdBy: userId || null,
    createdAt: new Date(),
  });

  // 7. Realtime event: ai-completed
  emitSocketEvent('ai-completed', {
    caseId: caseId.toString(),
    briefId: brief._id.toString(),
    kind: 'CASE_QA',
  });

  return brief;
}

/**
 * Retrieves all briefs and Q&A records for a specific case.
 *
 * @param {string} caseId - ObjectId of the case
 * @returns {Promise<Array>} List of AIBriefs sorted latest first
 */
export async function getBriefsByCaseId(caseId) {
  return AIBrief.find({ caseId }).sort({ createdAt: -1 }).lean();
}

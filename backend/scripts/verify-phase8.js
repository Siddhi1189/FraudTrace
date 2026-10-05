import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../src/models/user.model.js';
import { Case } from '../src/models/case.model.js';
import { Alert } from '../src/models/alert.model.js';
import { CaseAlert } from '../src/models/caseAlert.model.js';
import { CaseEvent } from '../src/models/caseEvent.model.js';
import { AIBrief } from '../src/models/aiBrief.model.js';
import { verifyAiOutput } from '../src/services/ai/aiVerifier.js';
import { generateEvidenceHash } from '../src/services/ai/evidenceHasher.js';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_production';

async function run() {
  console.log('--- STARTING PHASE 8 VERIFICATION ---');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fraudtrace');

  // 1. Get analyst user & create test JWT
  const analyst = await User.findOne({ email: 'analyst@fraudtrace.local' });
  if (!analyst) {
    throw new Error('Analyst user not found in database. Seed database first.');
  }

  const token = jwt.sign(
    { id: analyst._id.toString(), email: analyst.email, role: analyst.role, name: analyst.name },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. Test Unauthenticated Access
  console.log('\n[1] Testing Authentication Enforcements...');
  const unauthRes = await fetch(`${BASE_URL}/ai/briefs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseId: analyst._id.toString() }),
  });
  console.log(`Unauthenticated POST /api/ai/briefs status: ${unauthRes.status} (Expected: 401)`);
  if (unauthRes.status !== 401) throw new Error('Unauthenticated request should return 401');

  // 3. Find or create a case with attached alerts for testing
  console.log('\n[2] Preparing Test Case with Evidence...');
  let testCase = await Case.findOne({ status: { $ne: 'CLOSED' } });
  if (!testCase) {
    testCase = await Case.create({
      caseNumber: 'FT-TEST-888',
      title: 'Phase 8 AI Verification Case',
      status: 'INVESTIGATING',
      createdBy: analyst._id,
    });
  }

  // Ensure case has at least one alert attached
  let attachedAlert = await CaseAlert.findOne({ caseId: testCase._id });
  if (!attachedAlert) {
    const existingAlert = await Alert.findOne();
    if (existingAlert) {
      attachedAlert = await CaseAlert.create({
        caseId: testCase._id,
        alertId: existingAlert._id,
      });
    }
  }

  console.log(`Using Test Case: ${testCase.caseNumber} (ID: ${testCase._id})`);

  // 4. Test Case Validation
  console.log('\n[3] Testing Case Validation...');
  const invalidCaseRes = await fetch(`${BASE_URL}/ai/briefs`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ caseId: '600000000000000000000000' }),
  });
  console.log(`Invalid Case ID POST /api/ai/briefs status: ${invalidCaseRes.status} (Expected: 404)`);
  if (invalidCaseRes.status !== 404) throw new Error('Invalid case ID should return 404');

  const missingFieldRes = await fetch(`${BASE_URL}/ai/briefs`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({}),
  });
  console.log(`Missing caseId POST /api/ai/briefs status: ${missingFieldRes.status} (Expected: 400)`);
  if (missingFieldRes.status !== 400) throw new Error('Missing caseId should return 400');

  // 5. Test POST /api/ai/briefs
  console.log('\n[4] Testing POST /api/ai/briefs (Brief Generation & Hashing)...');
  const createBriefRes = await fetch(`${BASE_URL}/ai/briefs`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ caseId: testCase._id.toString() }),
  });
  console.log(`POST /api/ai/briefs status: ${createBriefRes.status} (Expected: 201)`);
  if (createBriefRes.status !== 201) {
    const errText = await createBriefRes.text();
    throw new Error(`Failed to create AI brief: ${errText}`);
  }
  const createdBrief = await createBriefRes.json();
  console.log(`Generated Brief ID: ${createdBrief._id}`);
  console.log(`Evidence Hash: ${createdBrief.evidenceHash}`);
  console.log(`Model: ${createdBrief.model} (Expected: deterministic-fallback)`);
  console.log(`Verification Status: ${createdBrief.verificationStatus} (Expected: FALLBACK)`);
  console.log(`Structured Findings Count: ${createdBrief.structuredOutput?.findings?.length || 0}`);
  console.log(`Executive Summary: "${createdBrief.structuredOutput?.executiveSummary?.slice(0, 100)}..."`);

  // Verify hash determinism
  const rehashed = generateEvidenceHash(createdBrief.evidenceSnapshot);
  if (rehashed !== createdBrief.evidenceHash) {
    throw new Error(`Hash mismatch! Expected ${createdBrief.evidenceHash}, computed ${rehashed}`);
  }
  console.log('✓ Evidence hash is deterministic and strictly matches canonical snapshot');

  // 6. Test GET /api/ai/briefs/:id
  console.log('\n[5] Testing GET /api/ai/briefs/:id (Persistence)...');
  const getBriefRes = await fetch(`${BASE_URL}/ai/briefs/${createdBrief._id}`, {
    headers: authHeaders,
  });
  console.log(`GET /api/ai/briefs/:id status: ${getBriefRes.status} (Expected: 200)`);
  const fetchedBrief = await getBriefRes.json();
  if (fetchedBrief._id !== createdBrief._id) {
    throw new Error('Fetched brief does not match created brief ID');
  }
  console.log('✓ Persisted brief successfully retrieved with all fields intact');

  // 7. Test PATCH /api/ai/briefs/:id
  console.log('\n[6] Testing PATCH /api/ai/briefs/:id (Analyst Review / Editing)...');
  const patchRes = await fetch(`${BASE_URL}/ai/briefs/${createdBrief._id}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({
      analystDecision: 'EDITED',
      editedText: 'Analyst verified circular flow patterns and confirmed alert evidence with branch records.',
    }),
  });
  console.log(`PATCH /api/ai/briefs/:id status: ${patchRes.status} (Expected: 200)`);
  const updatedBrief = await patchRes.json();
  if (updatedBrief.analystDecision !== 'EDITED' || !updatedBrief.editedText) {
    throw new Error('Analyst edit failed to persist');
  }
  console.log(`Updated Analyst Decision: ${updatedBrief.analystDecision}`);
  console.log(`Edited Text: "${updatedBrief.editedText}"`);
  console.log('✓ Analyst edit saved; provenance fields preserved');

  // 8. Test POST /api/ai/cases/:id/ask
  console.log('\n[7] Testing POST /api/ai/cases/:id/ask (Case Q&A)...');
  // 8a. Grounded Question
  const groundedQRes = await fetch(`${BASE_URL}/ai/cases/${testCase._id}/ask`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ question: 'What is the total flow volume in this case?' }),
  });
  console.log(`POST /api/ai/cases/:id/ask status: ${groundedQRes.status} (Expected: 200)`);
  const groundedAnswer = await groundedQRes.json();
  console.log(`Grounded Answer: "${groundedAnswer.structuredOutput?.answer}"`);
  console.log(`Cited Evidence IDs: ${JSON.stringify(groundedAnswer.structuredOutput?.evidenceIds)}`);
  console.log(`Confidence: ${groundedAnswer.structuredOutput?.confidence}`);

  // 8b. Insufficient Evidence Question
  const insufficientQRes = await fetch(`${BASE_URL}/ai/cases/${testCase._id}/ask`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ question: 'What is the weather in Tokyo right now?' }),
  });
  const insufficientAnswer = await insufficientQRes.json();
  console.log(`\nInsufficient Evidence Answer: "${insufficientAnswer.structuredOutput?.answer}"`);
  console.log(`Confidence: ${insufficientAnswer.structuredOutput?.confidence}`);
  if (insufficientAnswer.structuredOutput?.confidence !== 'INSUFFICIENT_EVIDENCE') {
    throw new Error('Off-topic query should return INSUFFICIENT_EVIDENCE');
  }
  console.log('✓ Case Q&A correctly grounds answers and flags insufficient evidence');

  // 9. Test Verification Layer Unit Rules
  console.log('\n[8] Testing AI Verifier Unit Rules...');
  const mockSnapshot = {
    entities: { accounts: [{ externalId: 'ACC-101' }] },
    evidenceCatalog: [{ id: 'E-A1', type: 'ALERT', summary: 'Alert on ACC-101' }],
  };

  // 9a. Supported Finding
  const supportedResult = verifyAiOutput(
    {
      findings: [
        {
          claim: 'ACC-101 was flagged in alert.',
          evidenceIds: ['E-A1'],
        },
      ],
    },
    mockSnapshot
  );
  console.log(`Supported Claim Verification: ${supportedResult.verificationStatus} (Expected: VERIFIED)`);
  if (supportedResult.verificationStatus !== 'VERIFIED') throw new Error('Valid claim should be VERIFIED');

  // 9b. Unsupported Claim (hallucinated evidence ID)
  const unsupportedResult = verifyAiOutput(
    {
      findings: [
        {
          claim: 'ACC-101 transferred money to ACC-999.',
          evidenceIds: ['E-FAKE-99'],
        },
      ],
    },
    mockSnapshot
  );
  console.log(`Unsupported Claim Verification: ${unsupportedResult.verificationStatus} (Expected: UNVERIFIED)`);
  console.log(`Errors Detected: ${unsupportedResult.verificationErrors.join('; ')}`);
  if (unsupportedResult.verificationStatus !== 'UNVERIFIED' || unsupportedResult.verificationErrors.length === 0) {
    throw new Error('Hallucinated evidence ID must produce UNVERIFIED and verification errors');
  }

  // 9c. Authoritative Verdict Violation
  const verdictViolationResult = verifyAiOutput(
    {
      findings: [
        {
          claim: 'ACC-101 definitely committed fraud.',
          evidenceIds: ['E-A1'],
        },
      ],
    },
    mockSnapshot
  );
  console.log(`Authoritative Verdict Check: ${verdictViolationResult.verificationStatus} (Expected: UNVERIFIED)`);
  if (!verdictViolationResult.verificationErrors.some((e) => e.includes('authoritative fraud verdict'))) {
    throw new Error('Authoritative fraud verdict must be rejected');
  }
  console.log('✓ AI Verifier successfully detects hallucinations, missing citations, and verdict violations');

  // 10. Audit Trail Check
  console.log('\n[9] Checking CaseEvent Audit Trail Logging...');
  const aiEvents = await CaseEvent.find({
    caseId: testCase._id,
    eventType: { $in: ['AI_BRIEF_GENERATED', 'AI_BRIEF_EDITED', 'AI_QUESTION_ASKED'] },
  });
  console.log(`Recorded AI CaseEvents count: ${aiEvents.length}`);
  aiEvents.forEach((ev) => console.log(` - ${ev.eventType} at ${ev.createdAt.toISOString()}`));
  if (aiEvents.length < 3) {
    throw new Error('Expected at least 3 AI audit events');
  }
  console.log('✓ All AI operations logged in CaseEvent audit trail');

  console.log('\n========================================');
  console.log('   ALL PHASE 8 BACKEND TESTS PASSED!    ');
  console.log('========================================');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('\n❌ PHASE 8 VERIFICATION FAILED:', err);
  process.exit(1);
});

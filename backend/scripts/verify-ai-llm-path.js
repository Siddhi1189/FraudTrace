import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import { Case } from '../src/models/case.model.js';
import { Alert } from '../src/models/alert.model.js';
import { CaseAlert } from '../src/models/caseAlert.model.js';
import { User } from '../src/models/user.model.js';
import * as aiService from '../src/services/ai.service.js';
import { buildCaseEvidenceSnapshot } from '../src/services/evidence/evidenceBuilder.js';

async function runAiPathVerification() {
  console.log('================================================================');
  console.log('  FRAUDTRACE AI LLM VERIFICATION & FALLBACK INTEGRATION SUITE   ');
  console.log('================================================================\n');

  await connectDB();

  // Find or create analyst user
  let analyst = await User.findOne({ email: 'analyst@fraudtrace.local' });
  if (!analyst) {
    analyst = await User.create({
      name: 'Analyst User',
      email: 'analyst@fraudtrace.local',
      passwordHash: 'dummyhash',
      role: 'ANALYST',
    });
  }

  // Find or create test case with alert
  let testCase = await Case.findOne({ status: { $ne: 'CLOSED' } });
  if (!testCase) {
    testCase = await Case.create({
      caseNumber: 'FT-AI-TEST-900',
      title: 'AI Verification Test Case',
      status: 'INVESTIGATING',
      createdBy: analyst._id,
    });
  }

  let attachedAlert = await CaseAlert.findOne({ caseId: testCase._id });
  if (!attachedAlert) {
    let alert = await Alert.findOne();
    if (!alert) {
      alert = await Alert.create({
        pattern: 'CIRCULAR_FLOW',
        fingerprint: 'MOCK:CF:1',
        entities: { accounts: ['ACC-CIRC-1A', 'ACC-CIRC-1B'], devices: [], merchants: [] },
        evidence: { summary: 'Mock circular flow', transactions: [] },
        severity: 'HIGH',
        score: 85,
        triageStatus: 'NEW',
      });
    }
    attachedAlert = await CaseAlert.create({ caseId: testCase._id, alertId: alert._id });
  }

  // Inspect canonical snapshot for valid citation references
  const snapshot = await buildCaseEvidenceSnapshot(testCase._id.toString());
  const validEvidenceIds = snapshot.evidenceCatalog.map((e) => e.id);
  const sampleValidId = validEvidenceIds[0] || 'E-ALERT-1';

  // Set mock API key to activate LLM path in llmClient
  process.env.GEMINI_API_KEY = 'mock-gemini-test-key';
  process.env.LLM_MODEL = 'gemini-1.5-flash';

  let mockResponseJson = null;

  // Intercept native global fetch
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify(mockResponseJson) }],
            },
          },
        ],
      }),
    };
  };

  try {
    // -------------------------------------------------------------
    // Test A: Valid Grounded Output -> VERIFIED
    // -------------------------------------------------------------
    console.log('[TEST A] Valid grounded LLM output...');
    mockResponseJson = {
      executiveSummary: `Grounded case investigation brief for ${testCase.caseNumber}.`,
      findings: [
        {
          id: 'F-1',
          claim: `Observed detected transaction pattern in case ${testCase.caseNumber}.`,
          evidenceIds: [sampleValidId],
          category: 'FACTUAL_EVIDENCE',
        },
      ],
      suspiciousIndicators: ['Observed pattern indicators'],
      entityRoles: [],
      timelineAnalysis: 'Chronological timeline reviewed.',
      limitations: ['Bounded to provided records.'],
      recommendations: ['Perform analyst review.'],
    };

    const briefA = await aiService.createBrief({
      caseId: testCase._id.toString(),
      userId: analyst._id.toString(),
    });

    console.log(`  -> Model: ${briefA.model}`);
    console.log(`  -> Verification Status: ${briefA.verificationStatus}`);
    console.log(`  -> Verification Errors: ${briefA.verificationErrors.length}`);
    if (briefA.verificationStatus !== 'VERIFIED') {
      throw new Error(`Expected VERIFIED, got ${briefA.verificationStatus}`);
    }
    console.log('  -> [PASS] Test A verified successfully.\n');

    // -------------------------------------------------------------
    // Test B: Fake Evidence ID + Unmatched Amount -> UNVERIFIED -> Persisted as FALLBACK
    // -------------------------------------------------------------
    console.log('[TEST B] Hallucinated evidence ID + ungrounded amount...');
    mockResponseJson = {
      executiveSummary: 'Hallucinated brief with phantom claims.',
      findings: [
        {
          id: 'F-1',
          claim: 'Unverified party embezzled ₹99,999,999 across non-existent channels.',
          evidenceIds: ['E-HALLUCINATED-999'],
          category: 'FACTUAL_EVIDENCE',
        },
      ],
      suspiciousIndicators: [],
      entityRoles: [],
      timelineAnalysis: 'Invalid timeline',
      limitations: [],
      recommendations: [],
    };

    const briefB = await aiService.createBrief({
      caseId: testCase._id.toString(),
      userId: analyst._id.toString(),
    });

    console.log(`  -> Model: ${briefB.model} (Expected: deterministic-fallback)`);
    console.log(`  -> Verification Status: ${briefB.verificationStatus} (Expected: FALLBACK)`);
    console.log(`  -> Logged Errors: ${briefB.verificationErrors.join('; ')}`);
    if (briefB.verificationStatus !== 'FALLBACK' || briefB.model !== 'deterministic-fallback') {
      throw new Error(`Expected FALLBACK and deterministic-fallback model, got status ${briefB.verificationStatus}, model ${briefB.model}`);
    }
    if (briefB.verificationErrors.length === 0) {
      throw new Error('Expected verificationErrors to record LLM rejection causes');
    }
    console.log('  -> [PASS] Test B unverified output reverted to deterministic fallback.\n');

    // -------------------------------------------------------------
    // Test C: Mix of valid and invalid findings -> PARTIALLY_VERIFIED (invalid pruned)
    // -------------------------------------------------------------
    console.log('[TEST C] Mixed valid and invalid findings...');
    mockResponseJson = {
      executiveSummary: `Grounded case investigation brief for ${testCase.caseNumber}.`,
      findings: [
        {
          id: 'F-1',
          claim: `Valid finding supported by catalog evidence ${sampleValidId}.`,
          evidenceIds: [sampleValidId],
          category: 'FACTUAL_EVIDENCE',
        },
        {
          id: 'F-2',
          claim: 'Invalid finding citing unknown fake citation.',
          evidenceIds: ['E-FAKE-CITATION-404'],
          category: 'SUSPICIOUS_INDICATOR',
        },
      ],
      suspiciousIndicators: [],
      entityRoles: [],
      timelineAnalysis: 'Mixed analysis',
      limitations: [],
      recommendations: [],
    };

    const briefC = await aiService.createBrief({
      caseId: testCase._id.toString(),
      userId: analyst._id.toString(),
    });

    console.log(`  -> Model: ${briefC.model}`);
    console.log(`  -> Verification Status: ${briefC.verificationStatus} (Expected: PARTIALLY_VERIFIED)`);
    console.log(`  -> Verification Errors:`, briefC.verificationErrors);
    console.log(`  -> Findings Count before/after pruning: 2 -> ${briefC.structuredOutput?.findings?.length}`);
    if (briefC.verificationStatus !== 'PARTIALLY_VERIFIED') {
      throw new Error(`Expected PARTIALLY_VERIFIED, got ${briefC.verificationStatus}`);
    }
    if (briefC.structuredOutput?.findings?.length !== 1) {
      throw new Error(`Expected invalid finding to be filtered out, found ${briefC.structuredOutput?.findings?.length} findings`);
    }
    if (briefC.structuredOutput.findings[0].id !== 'F-1') {
      throw new Error('Expected valid finding F-1 to be preserved');
    }
    console.log('  -> [PASS] Test C partially verified output pruned invalid findings.\n');

    // -------------------------------------------------------------
    // Test D: Q&A Answer with wrong number rejected
    // -------------------------------------------------------------
    console.log('[TEST D] Q&A answer with fabricated number/amount...');
    mockResponseJson = {
      answer: 'The total suspicious money laundered was ₹88,888,888 across 999 fraudulent transactions.',
      evidenceIds: [sampleValidId],
      confidence: 'GROUNDED',
      unsupportedReason: null,
    };

    const qaBrief = await aiService.askCaseQuestion(testCase._id.toString(), {
      question: 'How much money was laundered?',
      userId: analyst._id.toString(),
    });

    console.log(`  -> Model: ${qaBrief.model} (Expected: deterministic-fallback)`);
    console.log(`  -> Verification Status: ${qaBrief.verificationStatus} (Expected: FALLBACK)`);
    console.log(`  -> Fallback Answer: "${qaBrief.structuredOutput?.answer}"`);
    console.log(`  -> Rejection Errors: ${qaBrief.verificationErrors.join('; ')}`);
    if (qaBrief.verificationStatus !== 'FALLBACK') {
      throw new Error(`Expected QA rejection to result in FALLBACK, got ${qaBrief.verificationStatus}`);
    }
    if (qaBrief.verificationErrors.length === 0) {
      throw new Error('Expected rejection errors for unverified numbers');
    }
    console.log('  -> [PASS] Test D Q&A answer with wrong number rejected.\n');

    console.log('================================================================');
    console.log('  ALL AI VERIFICATION & FALLBACK INTEGRATION TESTS PASSED!      ');
    console.log('================================================================');
  } finally {
    globalThis.fetch = originalFetch;
    await mongoose.disconnect();
  }
}

runAiPathVerification().catch((err) => {
  console.error('\n❌ AI PATH VERIFICATION FAILED:', err);
  process.exit(1);
});

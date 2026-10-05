/**
 * Prohibited authoritative verdict patterns that violate AI Safety principles.
 * The AI is an investigative assistant, not an autonomous adjudicator.
 */
const FORBIDDEN_VERDICT_PATTERNS = [
  /\bdefinitely\s+committed\s+fraud\b/i,
  /\bguaranteed\s+fraud\b/i,
  /\bis\s+guilty\s+of\s+fraud\b/i,
  /\bconfirmed\s+fraudster\b/i,
  /\bfinal\s+fraud\s+verdict\b/i,
  /\bconvicted\s+of\s+fraud\b/i,
];

/**
 * Verifies AI output against the supplied evidence snapshot.
 * Detects unsupported factual claims, missing evidence IDs, unknown entities, and prohibited verdict language.
 *
 * @param {Object} structuredOutput - Structured AI output or Q&A response
 * @param {Object} evidenceSnapshot - Ground truth evidence snapshot
 * @param {boolean} isFallback - Whether the response was produced by the deterministic fallback
 * @returns {{ verificationStatus: string, verificationErrors: string[] }}
 */
export function verifyAiOutput(structuredOutput, evidenceSnapshot, isFallback = false) {
  if (isFallback) {
    return {
      verificationStatus: 'FALLBACK',
      verificationErrors: [],
    };
  }

  const errors = [];
  const catalog = evidenceSnapshot.evidenceCatalog || [];
  const validEvidenceIds = new Set(catalog.map((item) => item.id));

  // Extract all valid known entity identifiers from snapshot
  const knownEntities = new Set();
  if (evidenceSnapshot.entities) {
    evidenceSnapshot.entities.accounts?.forEach((a) => knownEntities.add(a.externalId));
    evidenceSnapshot.entities.devices?.forEach((d) => knownEntities.add(d.externalId));
    evidenceSnapshot.entities.merchants?.forEach((m) => knownEntities.add(m.externalId));
  }
  if (evidenceSnapshot.transactions) {
    evidenceSnapshot.transactions.forEach((tx) => {
      if (tx.externalTransactionId) knownEntities.add(tx.externalTransactionId);
      if (tx.fromAccount) knownEntities.add(tx.fromAccount);
      if (tx.destination) knownEntities.add(tx.destination);
    });
  }

  // Handle Brief findings
  const findings = Array.isArray(structuredOutput?.findings) ? structuredOutput.findings : [];
  let validFindingsCount = 0;

  if (findings.length === 0 && !structuredOutput?.answer) {
    errors.push('AI output contains no structured findings or answer to verify.');
  }

  // 1. Verify findings in an Investigation Brief
  findings.forEach((finding, idx) => {
    const claim = finding.claim || finding.text || '';
    const citedIds = Array.isArray(finding.evidenceIds) ? finding.evidenceIds : [];

    // Check for empty evidence citations
    if (citedIds.length === 0) {
      errors.push(`Finding #${idx + 1} ("${claim.slice(0, 60)}...") cites no supporting evidence IDs.`);
      return;
    }

    // Check that every cited ID exists in the evidence catalog
    let hasInvalidId = false;
    citedIds.forEach((id) => {
      if (!validEvidenceIds.has(id)) {
        errors.push(`Finding #${idx + 1} cites unrecognized evidence ID "${id}".`);
        hasInvalidId = true;
      }
    });

    // Check for prohibited authoritative verdict language
    FORBIDDEN_VERDICT_PATTERNS.forEach((regex) => {
      if (regex.test(claim)) {
        errors.push(`Finding #${idx + 1} violates safety policy: uses authoritative fraud verdict language.`);
        hasInvalidId = true;
      }
    });

    // Ground entity references in finding text
    const mentionedEntities = claim.match(/\b(ACC-\d+|DEV-\d+|MER-\d+|TX-\d+)\b/g) || [];
    mentionedEntities.forEach((entityId) => {
      if (!knownEntities.has(entityId)) {
        errors.push(`Finding #${idx + 1} mentions entity "${entityId}" which is absent from the evidence snapshot.`);
        hasInvalidId = true;
      }
    });

    if (!hasInvalidId) {
      validFindingsCount++;
    }
  });

  // 2. Verify Q&A Answer if present
  if (structuredOutput?.answer) {
    const answer = structuredOutput.answer;
    const citedIds = Array.isArray(structuredOutput.evidenceIds) ? structuredOutput.evidenceIds : [];

    if (structuredOutput.confidence === 'INSUFFICIENT_EVIDENCE') {
      // Insufficient evidence response is a valid grounded response
      return {
        verificationStatus: 'VERIFIED',
        verificationErrors: [],
      };
    }

    if (citedIds.length === 0 && !answer.toLowerCase().includes('insufficient evidence')) {
      errors.push('Q&A answer provides claims without citing supporting evidence IDs.');
    }

    citedIds.forEach((id) => {
      if (!validEvidenceIds.has(id)) {
        errors.push(`Q&A answer cites unrecognized evidence ID "${id}".`);
      }
    });

    FORBIDDEN_VERDICT_PATTERNS.forEach((regex) => {
      if (regex.test(answer)) {
        errors.push('Q&A answer violates safety policy: uses authoritative fraud verdict language.');
      }
    });

    const mentionedEntities = answer.match(/\b(ACC-\d+|DEV-\d+|MER-\d+|TX-\d+)\b/g) || [];
    mentionedEntities.forEach((entityId) => {
      if (!knownEntities.has(entityId)) {
        errors.push(`Q&A answer mentions entity "${entityId}" which is absent from the evidence snapshot.`);
      }
    });
  }

  // 3. Determine verification status
  let verificationStatus = 'VERIFIED';
  if (errors.length > 0) {
    if (validFindingsCount > 0) {
      verificationStatus = 'PARTIALLY_VERIFIED';
    } else {
      verificationStatus = 'UNVERIFIED';
    }
  }

  return {
    verificationStatus,
    verificationErrors: errors,
  };
}

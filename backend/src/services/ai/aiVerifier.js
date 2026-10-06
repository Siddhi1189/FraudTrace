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
 * Detects unsupported factual claims, missing evidence IDs, unknown entities,
 * ungrounded numbers/amounts, and prohibited verdict language.
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
  const catalog = evidenceSnapshot?.evidenceCatalog || [];
  const validEvidenceIds = new Set(catalog.map((item) => item.id));

  // 1. Dynamic entity-ID collection from catalog and snapshot (I5)
  const knownEntities = new Set();
  catalog.forEach((item) => {
    if (item.data?.externalId) knownEntities.add(item.data.externalId);
    if (item.data?.externalTransactionId) knownEntities.add(item.data.externalTransactionId);
    if (item.data?.fromAccount) knownEntities.add(item.data.fromAccount);
    if (item.data?.destination) knownEntities.add(item.data.destination);
    if (item.data?.merchantId) knownEntities.add(item.data.merchantId);
    if (item.data?.deviceId) knownEntities.add(item.data.deviceId);
    if (item.data?.accountId) knownEntities.add(item.data.accountId);
    if (item.data?.caseNumber) knownEntities.add(item.data.caseNumber);
    if (item.data?.label) knownEntities.add(item.data.label);
  });

  if (evidenceSnapshot?.case?.caseNumber) knownEntities.add(evidenceSnapshot.case.caseNumber);
  if (evidenceSnapshot?.entities) {
    evidenceSnapshot.entities.accounts?.forEach((a) => a.externalId && knownEntities.add(a.externalId));
    evidenceSnapshot.entities.devices?.forEach((d) => d.externalId && knownEntities.add(d.externalId));
    evidenceSnapshot.entities.merchants?.forEach((m) => m.externalId && knownEntities.add(m.externalId));
  }
  if (evidenceSnapshot?.transactions) {
    evidenceSnapshot.transactions.forEach((tx) => {
      if (tx.externalTransactionId) knownEntities.add(tx.externalTransactionId);
      if (tx.fromAccount) knownEntities.add(tx.fromAccount);
      if (tx.destination) knownEntities.add(tx.destination);
    });
  }
  if (evidenceSnapshot?.rings) {
    evidenceSnapshot.rings.forEach((r) => r.label && knownEntities.add(r.label));
  }

  // 2. Numerical fact extraction from derived facts and catalog data (I5)
  const validNumbers = new Set();
  function addNumber(val) {
    if (val === null || val === undefined) return;
    const n = Number(val);
    if (!isNaN(n) && isFinite(n)) {
      validNumbers.add(n);
      validNumbers.add(Math.round(n));
      validNumbers.add(Math.floor(n));
    }
  }

  function collectNumbers(obj) {
    if (!obj) return;
    if (typeof obj === 'number') {
      addNumber(obj);
    } else if (typeof obj === 'string') {
      const cleaned = obj.replace(/[₹$,]/g, '').trim();
      const n = Number(cleaned);
      if (!isNaN(n) && isFinite(n) && cleaned.length > 0) {
        addNumber(n);
      }
    } else if (Array.isArray(obj)) {
      obj.forEach(collectNumbers);
    } else if (typeof obj === 'object') {
      Object.values(obj).forEach(collectNumbers);
    }
  }

  collectNumbers(evidenceSnapshot?.derivedFacts);
  collectNumbers(evidenceSnapshot?.evidenceCatalog);
  collectNumbers(evidenceSnapshot?.alerts);
  collectNumbers(evidenceSnapshot?.rings);
  collectNumbers(evidenceSnapshot?.transactions);
  collectNumbers(evidenceSnapshot?.entities);

  // Common legitimate non-data numbers (indices, dates, standard thresholds)
  const benignNumbers = new Set([0, 1, 2, 3, 4, 5, 10, 15, 20, 24, 30, 60, 100, 2024, 2025, 2026, 2027]);

  // Helper: Verify entity IDs dynamically in arbitrary prose
  const ENTITY_TOKEN_REGEX = /\b([A-Z][A-Z0-9]{0,12}-[A-Z0-9-]+)\b/g;
  function verifyEntitiesInText(text, contextLabel) {
    if (!text || typeof text !== 'string') return;
    const matches = text.match(ENTITY_TOKEN_REGEX) || [];
    for (const token of matches) {
      if (token.startsWith('E-') || token.startsWith('F-') || validEvidenceIds.has(token)) continue;
      if (['CIRCULAR_FLOW', 'FAN_IN_FAN_OUT', 'SHARED_DEVICE', 'PASS_THROUGH', 'MERCHANT_CASHOUT'].includes(token)) continue;
      if (!knownEntities.has(token)) {
        errors.push(`${contextLabel} mentions entity "${token}" which is absent from the evidence snapshot.`);
      }
    }
  }

  // Helper: Verify numbers and currency amounts in arbitrary prose
  const CURRENCY_REGEX = /(?:₹|\$)\s*([0-9,]+(?:\.[0-9]+)?)/g;
  function verifyNumbersInText(text, contextLabel) {
    if (!text || typeof text !== 'string') return;

    // Check currency amounts
    let currMatch;
    while ((currMatch = CURRENCY_REGEX.exec(text)) !== null) {
      const rawAmt = currMatch[1].replace(/,/g, '');
      const amt = Number(rawAmt);
      if (!isNaN(amt) && !validNumbers.has(amt) && ![...validNumbers].some((vn) => Math.abs(vn - amt) <= 1)) {
        errors.push(`${contextLabel} cites unverified amount ₹${amt.toLocaleString()} not found in evidence snapshot.`);
      }
    }

    // Check freestanding numbers attached to metrics (e.g. "99 transactions", "15 accounts")
    const METRIC_NUMBER_REGEX = /\b([0-9]{2,})\s*(?:transactions?|transfers?|accounts?|senders?|receivers?|instances?|devices?|merchants?)\b/gi;
    let metricMatch;
    while ((metricMatch = METRIC_NUMBER_REGEX.exec(text)) !== null) {
      const n = parseInt(metricMatch[1], 10);
      if (!isNaN(n) && !benignNumbers.has(n) && !validNumbers.has(n) && ![...validNumbers].some((vn) => Math.abs(vn - n) <= 1)) {
        errors.push(`${contextLabel} cites unverified metric value "${n}" not matching facts or catalog data.`);
      }
    }
  }

  // Helper: Check forbidden verdict language
  function verifyVerdictLanguage(text, contextLabel) {
    if (!text || typeof text !== 'string') return;
    FORBIDDEN_VERDICT_PATTERNS.forEach((regex) => {
      if (regex.test(text)) {
        errors.push(`${contextLabel} violates safety policy: uses authoritative fraud verdict language.`);
      }
    });
  }

  // 3. Verify Brief structured fields
  const findings = Array.isArray(structuredOutput?.findings) ? structuredOutput.findings : [];
  let validFindingsCount = 0;

  if (findings.length === 0 && !structuredOutput?.answer) {
    errors.push('AI output contains no structured findings or answer to verify.');
  }

  // Verify executiveSummary
  if (structuredOutput?.executiveSummary) {
    verifyVerdictLanguage(structuredOutput.executiveSummary, 'Executive summary');
    verifyEntitiesInText(structuredOutput.executiveSummary, 'Executive summary');
    verifyNumbersInText(structuredOutput.executiveSummary, 'Executive summary');
  }

  // Verify findings
  findings.forEach((finding, idx) => {
    const claim = finding.claim || finding.text || '';
    const citedIds = Array.isArray(finding.evidenceIds) ? finding.evidenceIds : [];
    const contextLabel = `Finding #${idx + 1}`;
    const initialErrorCount = errors.length;

    if (citedIds.length === 0) {
      errors.push(`${contextLabel} ("${claim.slice(0, 60)}...") cites no supporting evidence IDs.`);
    } else {
      citedIds.forEach((id) => {
        if (!validEvidenceIds.has(id)) {
          errors.push(`${contextLabel} cites unrecognized evidence ID "${id}".`);
        }
      });
    }

    verifyVerdictLanguage(claim, contextLabel);
    verifyEntitiesInText(claim, contextLabel);
    verifyNumbersInText(claim, contextLabel);

    if (errors.length === initialErrorCount) {
      validFindingsCount++;
    }
  });

  // Verify suspiciousIndicators
  if (Array.isArray(structuredOutput?.suspiciousIndicators)) {
    structuredOutput.suspiciousIndicators.forEach((si, idx) => {
      verifyVerdictLanguage(si, `Suspicious indicator #${idx + 1}`);
      verifyEntitiesInText(si, `Suspicious indicator #${idx + 1}`);
    });
  }

  // Verify entityRoles
  if (Array.isArray(structuredOutput?.entityRoles)) {
    structuredOutput.entityRoles.forEach((er, idx) => {
      const contextLabel = `Entity role #${idx + 1}`;
      if (er.entityId && !knownEntities.has(er.entityId)) {
        errors.push(`${contextLabel} specifies unknown entityId "${er.entityId}".`);
      }
      verifyVerdictLanguage(er.role, contextLabel);
      verifyEntitiesInText(er.role, contextLabel);
      if (Array.isArray(er.supportingEvidenceIds)) {
        er.supportingEvidenceIds.forEach((id) => {
          if (!validEvidenceIds.has(id)) {
            errors.push(`${contextLabel} cites unrecognized evidence ID "${id}".`);
          }
        });
      }
    });
  }

  // Verify timelineAnalysis
  if (structuredOutput?.timelineAnalysis) {
    verifyVerdictLanguage(structuredOutput.timelineAnalysis, 'Timeline analysis');
    verifyEntitiesInText(structuredOutput.timelineAnalysis, 'Timeline analysis');
    verifyNumbersInText(structuredOutput.timelineAnalysis, 'Timeline analysis');
  }

  // Verify recommendations
  if (Array.isArray(structuredOutput?.recommendations)) {
    structuredOutput.recommendations.forEach((rec, idx) => {
      verifyVerdictLanguage(rec, `Recommendation #${idx + 1}`);
      verifyEntitiesInText(rec, `Recommendation #${idx + 1}`);
    });
  }

  // 4. Verify Q&A Answer
  if (structuredOutput?.answer) {
    const answer = structuredOutput.answer;
    const citedIds = Array.isArray(structuredOutput.evidenceIds) ? structuredOutput.evidenceIds : [];

    if (structuredOutput.confidence === 'INSUFFICIENT_EVIDENCE') {
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

    verifyVerdictLanguage(answer, 'Q&A answer');
    verifyEntitiesInText(answer, 'Q&A answer');
    verifyNumbersInText(answer, 'Q&A answer');
  }

  // 5. Determine verification status
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

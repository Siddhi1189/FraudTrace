/**
 * Generates a structured investigation brief deterministically from verified evidence snapshot.
 * Used when GEMINI_API_KEY is not configured or LLM is unreachable.
 *
 * @param {Object} evidenceSnapshot - Canonical evidence snapshot
 * @returns {Object} Structured investigation brief adhering to FT-23 schema
 */
export function generateDeterministicBrief(evidenceSnapshot) {
  const caseInfo = evidenceSnapshot.case;
  const alerts = evidenceSnapshot.alerts || [];
  const rings = evidenceSnapshot.rings || [];
  const accounts = evidenceSnapshot.entities?.accounts || [];
  const devices = evidenceSnapshot.entities?.devices || [];
  const transactions = evidenceSnapshot.transactions || [];
  const derived = evidenceSnapshot.derivedFacts || {};
  const catalog = evidenceSnapshot.evidenceCatalog || [];

  const catalogMapByType = {};
  catalog.forEach((item) => {
    if (!catalogMapByType[item.type]) catalogMapByType[item.type] = [];
    catalogMapByType[item.type].push(item.id);
  });

  const alertEvidenceIds = catalogMapByType['ALERT'] || [];
  const ringEvidenceIds = catalogMapByType['RING'] || [];
  const txEvidenceIds = catalogMapByType['TRANSACTION'] || [];
  const factEvidenceIds = catalogMapByType['DERIVED_METRIC'] || [];
  const accEvidenceIds = catalogMapByType['ACCOUNT'] || [];

  const findings = [];
  let findingCounter = 1;

  // Finding 1: Pattern alerts
  if (alerts.length > 0) {
    const patternNames = [...new Set(alerts.map((a) => a.pattern))].join(', ');
    findings.push({
      id: `F-${findingCounter++}`,
      claim: `Case exhibits ${alerts.length} fraud pattern alerts (${patternNames}).`,
      evidenceIds: alertEvidenceIds.slice(0, 3),
      category: 'SUSPICIOUS_INDICATOR',
    });
  }

  // Finding 2: Flow volume
  if (derived.totalVolume > 0) {
    findings.push({
      id: `F-${findingCounter++}`,
      claim: `Coordinated financial flow totals ₹${derived.totalVolume.toLocaleString()} across ${derived.transactionCount} transactions involving ${derived.uniqueSendersCount} sender accounts.`,
      evidenceIds: [...factEvidenceIds, ...txEvidenceIds.slice(0, 2)],
      category: 'FACTUAL_EVIDENCE',
    });
  }

  // Finding 3: Fraud Ring association
  if (rings.length > 0) {
    const ringLabels = rings.map((r) => `${r.label} (Score: ${r.score})`).join(', ');
    findings.push({
      id: `F-${findingCounter++}`,
      claim: `Associated with persistent fraud ring clusters: ${ringLabels}.`,
      evidenceIds: ringEvidenceIds.slice(0, 2),
      category: 'INTERPRETATION',
    });
  }

  // Finding 4: High risk accounts
  const highRiskAccounts = accounts.filter((a) => a.riskScore >= 70);
  if (highRiskAccounts.length > 0) {
    const accList = highRiskAccounts.map((a) => `${a.externalId} (${a.riskScore}/100)`).join(', ');
    findings.push({
      id: `F-${findingCounter++}`,
      claim: `High-risk accounts identified in case cluster: ${accList}.`,
      evidenceIds: accEvidenceIds.slice(0, 3),
      category: 'SUSPICIOUS_INDICATOR',
    });
  }

  const suspiciousIndicators = alerts.map((a) => `${a.pattern} (Severity: ${a.severity}, Score: ${a.score})`);

  const entityRoles = [];
  accounts.forEach((acc, idx) => {
    entityRoles.push({
      entityId: acc.externalId,
      role: acc.riskScore >= 70 ? 'Primary Suspicious Transactor' : 'Associated Account',
      supportingEvidenceIds: accEvidenceIds[idx] ? [accEvidenceIds[idx]] : [],
    });
  });

  devices.forEach((dev) => {
    entityRoles.push({
      entityId: dev.externalId,
      role: 'Shared Hardware Access Point',
      supportingEvidenceIds: catalogMapByType['DEVICE'] || [],
    });
  });

  const timelineAnalysis =
    derived.earliestTransaction && derived.latestTransaction
      ? `Transactions span from ${new Date(derived.earliestTransaction).toUTCString()} to ${new Date(derived.latestTransaction).toUTCString()}.`
      : 'Insufficient timestamp spread to establish complete chronological pattern.';

  const executiveSummary =
    `Deterministic Investigation Brief for ${caseInfo.caseNumber}: Case contains ${alerts.length} attached alerts with ` +
    `${rings.length} identified ring associations and ₹${(derived.totalVolume || 0).toLocaleString()} in total transaction flow. ` +
    `Analysis indicates coordinated activity across ${accounts.length} accounts.`;

  return {
    executiveSummary,
    findings,
    suspiciousIndicators,
    entityRoles,
    timelineAnalysis,
    limitations: [
      'Deterministic rule-based summary generated because GEMINI_API_KEY is not configured or active.',
      'Analysis is strictly bounded to supplied database records; external intelligence is unavailable.',
    ],
    recommendations: [
      'Inspect chronological transaction flow in the graph explorer for rapid velocity cycles.',
      'Verify device fingerprints for shared access across flagged accounts.',
      'Conduct human analyst review before setting case disposition.',
    ],
  };
}

/**
 * Answers a case investigation question deterministically using keyword grounding.
 * Returns grounded facts and citations, or "Insufficient evidence available for this question."
 *
 * @param {string} question - Analyst question
 * @param {Object} evidenceSnapshot - Ground truth evidence snapshot
 * @returns {Object} Structured Q&A answer
 */
export function answerQuestionDeterministically(question, evidenceSnapshot) {
  const qLower = question.toLowerCase();
  const catalog = evidenceSnapshot.evidenceCatalog || [];
  const accounts = evidenceSnapshot.entities?.accounts || [];
  const alerts = evidenceSnapshot.alerts || [];
  const rings = evidenceSnapshot.rings || [];
  const transactions = evidenceSnapshot.transactions || [];
  const derived = evidenceSnapshot.derivedFacts || {};

  // Check for specific account query (e.g. "Why was ACC-101 flagged?" or "What did ACC-101 do?")
  const matchedAccount = accounts.find((a) => qLower.includes(a.externalId.toLowerCase()));
  if (matchedAccount) {
    const accItem = catalog.find((c) => c.data?.externalId === matchedAccount.externalId);
    const relatedAlerts = alerts.filter(
      (a) => a.evidenceSummary && a.evidenceSummary.includes(matchedAccount.externalId)
    );
    const relatedAlertItems = catalog.filter(
      (c) => c.type === 'ALERT' && (c.summary.includes(matchedAccount.externalId) || relatedAlerts.some((ra) => ra.id === c.data?.alertId))
    );

    const citations = [accItem?.id, ...relatedAlertItems.map((r) => r.id)].filter(Boolean);

    return {
      answer: `Account ${matchedAccount.externalId} was flagged with an assessed risk score of ${matchedAccount.riskScore}/100. It participated in ${relatedAlerts.length > 0 ? relatedAlerts.map((a) => a.pattern).join(', ') : 'correlated transaction activity'} within the investigated network.`,
      evidenceIds: citations.length > 0 ? citations : [accItem?.id].filter(Boolean),
      confidence: 'GROUNDED',
      unsupportedReason: null,
    };
  }

  // Check for volume / amount query
  if (qLower.includes('volume') || qLower.includes('amount') || qLower.includes('total flow') || qLower.includes('money')) {
    const factItem = catalog.find((c) => c.type === 'DERIVED_METRIC');
    return {
      answer: `The total transaction volume under investigation is ₹${(derived.totalVolume || 0).toLocaleString()} across ${derived.transactionCount || 0} recorded transactions.`,
      evidenceIds: factItem ? [factItem.id] : [],
      confidence: 'GROUNDED',
      unsupportedReason: null,
    };
  }

  // Check for ring query
  if (qLower.includes('ring') || qLower.includes('fraud ring')) {
    if (rings.length > 0) {
      const ring = rings[0];
      const ringItem = catalog.find((c) => c.type === 'RING');
      return {
        answer: `This case is linked to Fraud Ring ${ring.label} with a ring score of ${ring.score}/100 and patterns: ${ring.patterns.join(', ')}.`,
        evidenceIds: ringItem ? [ringItem.id] : [],
        confidence: 'GROUNDED',
        unsupportedReason: null,
      };
    }
  }

  // Check for alert / pattern query
  if (qLower.includes('alert') || qLower.includes('pattern') || qLower.includes('flag')) {
    if (alerts.length > 0) {
      const alertItems = catalog.filter((c) => c.type === 'ALERT');
      const patterns = alerts.map((a) => `${a.pattern} (${a.severity})`).join(', ');
      return {
        answer: `The case has ${alerts.length} attached alerts: ${patterns}.`,
        evidenceIds: alertItems.map((a) => a.id).slice(0, 3),
        confidence: 'GROUNDED',
        unsupportedReason: null,
      };
    }
  }

  // If question cannot be answered from supplied evidence, return documented insufficient evidence message
  return {
    answer: 'Insufficient evidence available for this question.',
    evidenceIds: [],
    confidence: 'INSUFFICIENT_EVIDENCE',
    unsupportedReason: 'The available case evidence does not contain facts addressing this specific query.',
  };
}

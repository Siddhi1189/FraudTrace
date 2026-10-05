import { AnalysisRun } from '../models/analysisRun.model.js';
import { Alert } from '../models/alert.model.js';
import { FraudRing } from '../models/fraudRing.model.js';
import { FraudRingMember } from '../models/fraudRingMember.model.js';
import { AccountRisk } from '../models/accountRisk.model.js';
import { buildInMemoryGraph } from './graph/graphBuilder.js';
import { runAllDetectors } from './detectors/index.js';
import { groupAlertsIntoRings } from './rings/ringGrouping.service.js';
import { calculateAccountRisk } from './risk/riskEngine.service.js';
import { emitSocketEvent } from '../socket/index.js';
import { RULE_VERSION, DEFAULT_DETECTOR_CONFIG } from './detectors/detectorConfig.js';

export async function runFullAnalysis({ trigger = 'MANUAL', parameters = {} } = {}) {
  const startTime = Date.now();
  const stageMs = {};

  // Initialize historical AnalysisRun record
  const run = await AnalysisRun.create({
    trigger,
    ruleVersion: RULE_VERSION,
    status: 'RUNNING',
    parameters,
  });

  emitSocketEvent('analysis-started', {
    runId: run._id,
    trigger,
    timestamp: new Date().toISOString(),
  });

  try {
    // Stage 1: Build in-memory graph
    const t0 = Date.now();
    const graph = await buildInMemoryGraph();
    stageMs.graphConstruction = Date.now() - t0;

    emitSocketEvent('analysis-progress', {
      runId: run._id,
      stage: 'GRAPH_CONSTRUCTION',
      progress: 25,
      nodeCount: graph.nodeCount,
      edgeCount: graph.edgeCount,
    });

    // Stage 2: Run all 5 pattern detectors
    const t1 = Date.now();
    const { detections, breakdown } = runAllDetectors(graph);
    stageMs.detection = Date.now() - t1;

    emitSocketEvent('analysis-progress', {
      runId: run._id,
      stage: 'FRAUD_DETECTION',
      progress: 50,
      detectionCount: detections.length,
      breakdown,
    });

    // Stage 3: Group alerts into fraud rings
    const t2 = Date.now();
    const groupedRings = groupAlertsIntoRings(detections, graph);
    stageMs.ringGrouping = Date.now() - t2;

    emitSocketEvent('analysis-progress', {
      runId: run._id,
      stage: 'RING_GROUPING',
      progress: 75,
      ringCount: groupedRings.length,
    });

    // Stage 4: Persistence, Idempotent Reconciliation & Risk Scoring
    const t3 = Date.now();

    // 4a: Reconcile Fraud Rings by Deterministic Fingerprint
    const existingRings = await FraudRing.find({});
    const existingRingMap = new Map();
    let maxRingIndex = 0;

    for (const r of existingRings) {
      existingRingMap.set(r.fingerprint, r);
      const match = r.label?.match(/^RING-(\d+)$/);
      if (match) {
        const idx = parseInt(match[1], 10);
        if (idx > maxRingIndex) maxRingIndex = idx;
      }
    }

    const detectedRingFingerprints = new Set(groupedRings.map((r) => r.fingerprint));
    const currentRings = [];

    for (const r of groupedRings) {
      let ringDoc = existingRingMap.get(r.fingerprint);

      if (ringDoc) {
        // Reconcile/Update existing logical ring
        ringDoc.analysisRunId = run._id;
        ringDoc.status = 'ACTIVE';
        ringDoc.score = r.score;
        ringDoc.contributors = r.contributors;
        ringDoc.totalFlow = r.totalFlow;
        ringDoc.transactionCount = r.transactionCount;
        ringDoc.patterns = r.patterns;
        ringDoc.lastDetectedAt = new Date();
        await ringDoc.save();
      } else {
        // Assign next stable sequential label
        maxRingIndex++;
        const label = `RING-${String(maxRingIndex).padStart(3, '0')}`;
        ringDoc = await FraudRing.create({
          analysisRunId: run._id,
          fingerprint: r.fingerprint,
          label,
          status: 'ACTIVE',
          score: r.score,
          contributors: r.contributors,
          totalFlow: r.totalFlow,
          transactionCount: r.transactionCount,
          patterns: r.patterns,
          firstDetectedAt: new Date(),
          lastDetectedAt: new Date(),
        });
        existingRingMap.set(r.fingerprint, ringDoc);
      }

      r.label = ringDoc.label;
      r._id = ringDoc._id;
      currentRings.push(ringDoc);

      // Reconcile members: clean old members and insert current members
      await FraudRingMember.deleteMany({ ringId: ringDoc._id });
      const memberDocs = [];
      const seenMemberKeys = new Set();

      for (const m of r.members) {
        if (!m.mongoId) continue;
        const memberKey = `${m.entityType}:${m.mongoId}`;
        if (!seenMemberKeys.has(memberKey)) {
          seenMemberKeys.add(memberKey);
          memberDocs.push({
            ringId: ringDoc._id,
            entityType: m.entityType,
            entityId: m.mongoId,
          });
        }
      }

      if (memberDocs.length > 0) {
        await FraudRingMember.insertMany(memberDocs, { ordered: false });
      }
    }

    // Explicitly handle disappeared rings (Requirement 7)
    for (const [fp, rDoc] of existingRingMap.entries()) {
      if (!detectedRingFingerprints.has(fp) && rDoc.status === 'ACTIVE') {
        rDoc.status = 'DISSOLVED';
        await rDoc.save();
      }
    }

    // 4b: Reconcile Alerts with Triage Carry-Over
    const savedAlerts = [];
    for (const det of detections) {
      // Find ring that contains this detection's entities
      const matchingRing = groupedRings.find((r) => r.alerts.some((a) => a.fingerprint === det.fingerprint));
      const ringDoc = matchingRing ? existingRingMap.get(matchingRing.fingerprint) : null;

      let alertDoc = await Alert.findOne({ fingerprint: det.fingerprint });

      if (alertDoc) {
        // Reconcile existing alert: update analysisRunId, score, evidence, ringId
        // Preserving triageStatus ('NEW', 'REVIEWING', 'DISMISSED', 'ESCALATED')
        alertDoc.analysisRunId = run._id;
        alertDoc.pattern = det.pattern;
        alertDoc.severity = det.severity;
        alertDoc.score = det.score;
        alertDoc.evidence = det.evidence;
        alertDoc.ringId = ringDoc ? ringDoc._id : null;
        await alertDoc.save();

        emitSocketEvent('alert-updated', { alert: alertDoc });
      } else {
        alertDoc = await Alert.create({
          analysisRunId: run._id,
          fingerprint: det.fingerprint,
          pattern: det.pattern,
          severity: det.severity,
          score: det.score,
          triageStatus: 'NEW',
          evidence: det.evidence,
          ringId: ringDoc ? ringDoc._id : null,
        });

        emitSocketEvent('alert-created', { alert: alertDoc });
      }

      savedAlerts.push(alertDoc);
    }

    // 4c: Calculate and Save AccountRisk snapshots for each active account
    const accountNodes = Array.from(graph.nodes.values()).filter((n) => n.entityType === 'ACCOUNT');
    const riskDocs = [];
    let highRiskCount = 0;

    for (const accNode of accountNodes) {
      const risk = calculateAccountRisk({
        accountNode: accNode,
        graph,
        detections,
        rings: groupedRings,
      });

      if (risk.score >= 70) {
        highRiskCount++;
      }

      riskDocs.push({
        accountId: accNode.mongoId,
        analysisRunId: run._id,
        score: risk.score,
        contributors: risk.contributors,
        ruleVersion: risk.ruleVersion,
        whyFlagged: risk.whyFlagged,
      });
    }

    if (riskDocs.length > 0) {
      await AccountRisk.insertMany(riskDocs, { ordered: false });
    }

    stageMs.persistence = Date.now() - t3;
    stageMs.totalDuration = Date.now() - startTime;

    // Finalize AnalysisRun (Historical audit record)
    run.status = 'COMPLETED';
    run.completedAt = new Date();
    run.summary = {
      totalAlerts: savedAlerts.length,
      totalRings: currentRings.length,
      highRiskAccounts: highRiskCount,
      stageMs,
      breakdown,
    };
    await run.save();

    emitSocketEvent('analysis-completed', {
      runId: run._id,
      summary: run.summary,
      timestamp: new Date().toISOString(),
    });

    return {
      run,
      summary: run.summary,
    };
  } catch (error) {
    run.status = 'FAILED';
    run.error = error.message;
    run.completedAt = new Date();
    await run.save();
    throw error;
  }
}

export async function getAnalysisRunById(runId) {
  const run = await AnalysisRun.findById(runId).lean();
  if (!run) {
    const error = new Error('Analysis run not found');
    error.statusCode = 404;
    throw error;
  }
  return run;
}

export function getActiveRules() {
  return {
    ruleVersion: RULE_VERSION,
    detectorThresholds: DEFAULT_DETECTOR_CONFIG,
    scoringWeights: {
      account: {
        categoryCaps: {
          patternInvolvement: 50,
          ringMembership: 25,
          deviceAssociation: 15,
          transactionVelocity: 15,
          rapidPassThrough: 15,
        },
        explanation:
          'Maximum category contribution caps. Points awarded are deterministic evidence-based functions bounded by these caps (e.g., pattern involvement = min(50, 30 + 10 * detections); velocity = 12 pts for >= 5 transfers; pass-through = 15 pts).',
      },
      ring: {
        categoryCaps: {
          maxPatternSeverity: 50,
          coordinatedFlowVolume: 25,
          ringConnectivityDensity: 25,
        },
        explanation: 'Maximum contribution caps for fraud ring scoring.',
      },
    },
    riskThresholds: {
      low: [0, 39],
      medium: [40, 69],
      high: [70, 84],
      critical: [85, 100],
    },
  };
}

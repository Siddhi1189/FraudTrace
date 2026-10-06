import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAlerts, Alert } from '../../api/alertsApi';
import { fetchRings, FraudRing } from '../../api/ringsApi';
import { fetchCases, CaseItem } from '../../api/casesApi';
import { fetchDataBatches, DataBatch } from '../../api/dataApi';
import { runAnalysis, fetchActiveRules, AnalysisRunSummary, DetectorRules } from '../../api/analysisApi';
import { SeverityBadge } from '../../components/SeverityBadge';
import { RiskBadge } from '../../components/RiskBadge';
import { TriageStatusBadge } from '../../components/TriageStatusBadge';
import { PageHeader } from '../../components/PageHeader';
import { MetricTile } from '../../components/MetricTile';
import { Card } from '../../components/Card';
import { Pictograph, PictographRow } from '../../components/Pictograph';
import { ProgressStrip } from '../../components/motion/ProgressStrip';
import { Button } from '../../components/common/Button';
import { Table, Column } from '../../components/common/Table';
import { StateView } from '../../components/common/StateView';
import { Icon } from '../../components/common/Icons';
import { getSocket, AnalysisProgressPayload, AnalysisCompletedPayload, AlertCreatedPayload } from '../../lib/socket';
import styles from './DashboardPage.module.css';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertsCount, setAlertsCount] = useState<number>(0);
  const [rings, setRings] = useState<FraudRing[]>([]);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [batches, setBatches] = useState<DataBatch[]>([]);
  const [rules, setRules] = useState<DetectorRules | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Run analysis state & ProgressStrip
  const [isRunning, setIsRunning] = useState(false);
  const [runStage, setRunStage] = useState<string>('GRAPH_CONSTRUCTION');
  const [runProgress, setRunProgress] = useState<number>(0);
  const [runStageLabel, setRunStageLabel] = useState<string>('Analysis Pipeline Active');
  const [runSuccess, setRunSuccess] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  // New alert highlight tracking (ID of alert to highlight)
  const [highlightedAlertId, setHighlightedAlertId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [alertsRes, ringsRes, casesRes, batchesRes, rulesRes] = await Promise.all([
        fetchAlerts(),
        fetchRings(),
        fetchCases(),
        fetchDataBatches().catch(() => ({ batches: [], count: 0 })),
        fetchActiveRules().catch(() => null),
      ]);
      setAlerts(alertsRes.alerts || []);
      setAlertsCount(alertsRes.count ?? alertsRes.alerts?.length ?? 0);
      setRings(ringsRes.rings || []);
      setCases(casesRes.cases || []);
      setBatches(batchesRes.batches || []);
      if (rulesRes) setRules(rulesRes);
    } catch (err: unknown) {
      console.error('Failed to load dashboard data:', err);
      setError('Unable to load dashboard data from backend services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const socket = getSocket();
    if (!socket) return;

    const handleStarted = () => {
      setIsRunning(true);
      setRunStage('VALIDATION');
      setRunProgress(10);
      setRunStageLabel('Ingesting & Validating Transactions');
    };

    const handleProgress = (data: AnalysisProgressPayload) => {
      setIsRunning(true);
      setRunProgress(data.progress || 0);
      if (data.stage) setRunStage(data.stage);

      if (data.stage === 'GRAPH_CONSTRUCTION') {
        setRunStageLabel(`Building In-Memory Graph (${data.progress}% - ${data.nodeCount ?? 0} entities)`);
      } else if (data.stage === 'FRAUD_DETECTION') {
        setRunStageLabel(`Detecting Patterns (${data.progress}% - ${data.detectionCount ?? 0} patterns)`);
      } else if (data.stage === 'RING_GROUPING') {
        setRunStageLabel(`Clustering Fraud Rings (${data.progress}% - ${data.ringCount ?? 0} rings)`);
      } else if (data.stage === 'RISK_SCORING') {
        setRunStageLabel(`Calculating Calibrated Risk Scores (${data.progress}%)`);
      } else {
        setRunStageLabel(`Stage: ${data.stage} (${data.progress}%)`);
      }
    };

    const handleCompleted = (data: AnalysisCompletedPayload) => {
      setRunProgress(100);
      setTimeout(() => {
        setIsRunning(false);
      }, 500);
      const ringsCount = data?.summary?.totalRings ?? 'active';
      const countAlerts = data?.summary?.totalAlerts ?? '';
      setRunSuccess(`Analysis completed: ${ringsCount} rings, ${countAlerts} alerts.`);
      loadData();
      setTimeout(() => setRunSuccess(null), 7000);
    };

    const handleAlertCreated = (payload: AlertCreatedPayload) => {
      if (payload.alert) {
        setAlerts((prev) => [payload.alert, ...prev]);
        setAlertsCount((c) => c + 1);
        setHighlightedAlertId(payload.alert._id);
        setTimeout(() => setHighlightedAlertId(null), 1400);
      }
    };

    socket.on('analysis-started', handleStarted);
    socket.on('analysis-progress', handleProgress);
    socket.on('analysis-completed', handleCompleted);
    socket.on('alert-created', handleAlertCreated);

    return () => {
      socket.off('analysis-started', handleStarted);
      socket.off('analysis-progress', handleProgress);
      socket.off('analysis-completed', handleCompleted);
      socket.off('alert-created', handleAlertCreated);
    };
  }, []);

  const handleTriggerAnalysis = async () => {
    try {
      setIsRunning(true);
      setRunError(null);
      setRunSuccess(null);
      setRunStage('VALIDATION');
      setRunProgress(15);
      setRunStageLabel('Initiating Analysis Pipeline...');

      const response = await runAnalysis('MANUAL');
      setIsRunning(false);

      const summary: AnalysisRunSummary | undefined = response?.summary;
      const ringsCount = summary?.totalRings ?? 'active';
      const countAlerts = summary?.totalAlerts ?? '';
      setRunSuccess(`Analysis completed: ${ringsCount} rings, ${countAlerts} alerts.`);
      loadData();

      setTimeout(() => {
        setRunSuccess(null);
      }, 7000);
    } catch (err: unknown) {
      setIsRunning(false);
      if (err && typeof err === 'object' && 'error' in err) {
        setRunError((err as { error: string }).error);
      } else {
        setRunError('Analysis run failed. Verify server status.');
      }
    }
  };

  // KPIs & threshold bounds derived dynamically from active rules
  const criticalThreshold = rules?.riskThresholds?.critical?.[0] ?? 85;
  const highThreshold = rules?.riskThresholds?.high?.[0] ?? 70;
  const mediumThreshold = rules?.riskThresholds?.medium?.[0] ?? 40;

  const totalAlertsCount = alertsCount || alerts.length;
  // Critical count strictly derived from the same threshold condition as the risk-tier chart
  const criticalAlertsCount = alerts.filter((a) => a.score >= criticalThreshold).length;

  // FT-41: High-risk accounts replaced with Open Alerts count (awaiting triage)
  const openAlertsCount = alerts.filter((a) => a.triageStatus === 'NEW').length;

  const totalRingsCount = rings.length;
  const openCasesCount = cases.filter(
    (c) => c.status === 'OPEN' || c.status === 'INVESTIGATING'
  ).length;

  // Pictograph 1: Risk Tier Rows (linking to /alerts?severity=...)
  const riskTierRows: PictographRow[] = useMemo(() => {
    const counts = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    alerts.forEach((a) => {
      if (a.score >= criticalThreshold) counts.Critical++;
      else if (a.score >= highThreshold) counts.High++;
      else if (a.score >= mediumThreshold) counts.Medium++;
      else counts.Low++;
    });

    const criticalLabel = rules ? `Critical (≥${rules.riskThresholds.critical[0]})` : 'Critical (≥85)';
    const highLabel = rules ? `High (${rules.riskThresholds.high[0]}–${rules.riskThresholds.high[1]})` : 'High (70–84)';
    const medLabel = rules ? `Medium (${rules.riskThresholds.medium[0]}–${rules.riskThresholds.medium[1]})` : 'Medium (40–69)';
    const lowLabel = rules ? `Low (<${rules.riskThresholds.medium[0]})` : 'Low (<40)';

    return [
      {
        key: 'Critical',
        label: criticalLabel,
        count: counts.Critical,
        color: 'var(--sev-critical)',
        onClick: () => navigate('/alerts?severity=CRITICAL'),
      },
      {
        key: 'High',
        label: highLabel,
        count: counts.High,
        color: 'var(--sev-high)',
        onClick: () => navigate('/alerts?severity=HIGH'),
      },
      {
        key: 'Medium',
        label: medLabel,
        count: counts.Medium,
        color: 'var(--sev-medium)',
        onClick: () => navigate('/alerts?severity=MEDIUM'),
      },
      {
        key: 'Low',
        label: lowLabel,
        count: counts.Low,
        color: 'var(--sev-low)',
        onClick: () => navigate('/alerts?severity=LOW'),
      },
    ];
  }, [alerts, rules, criticalThreshold, highThreshold, mediumThreshold, navigate]);

  // Pictograph 2: Detection Pattern Rows (linking to /alerts?pattern=...)
  const patternRows: PictographRow[] = useMemo(() => {
    const patternMap: Record<string, number> = {
      CIRCULAR_FLOW: 0,
      FAN_IN_FAN_OUT: 0,
      SHARED_DEVICE: 0,
      PASS_THROUGH: 0,
      MERCHANT_CASHOUT: 0,
    };
    alerts.forEach((a) => {
      if (patternMap[a.pattern] !== undefined) {
        patternMap[a.pattern]++;
      } else {
        patternMap[a.pattern] = (patternMap[a.pattern] || 0) + 1;
      }
    });

    return [
      {
        key: 'CIRCULAR_FLOW',
        label: 'Circular Flow',
        count: patternMap.CIRCULAR_FLOW,
        color: 'var(--primary)',
        onClick: () => navigate('/alerts?pattern=CIRCULAR_FLOW'),
      },
      {
        key: 'FAN_IN_FAN_OUT',
        label: 'Fan-In / Fan-Out',
        count: patternMap.FAN_IN_FAN_OUT,
        color: 'var(--primary)',
        onClick: () => navigate('/alerts?pattern=FAN_IN_FAN_OUT'),
      },
      {
        key: 'SHARED_DEVICE',
        label: 'Shared Device',
        count: patternMap.SHARED_DEVICE,
        color: 'var(--primary)',
        onClick: () => navigate('/alerts?pattern=SHARED_DEVICE'),
      },
      {
        key: 'PASS_THROUGH',
        label: 'Pass-Through',
        count: patternMap.PASS_THROUGH,
        color: 'var(--primary)',
        onClick: () => navigate('/alerts?pattern=PASS_THROUGH'),
      },
      {
        key: 'MERCHANT_CASHOUT',
        label: 'Merchant Cash-Out',
        count: patternMap.MERCHANT_CASHOUT,
        color: 'var(--primary)',
        onClick: () => navigate('/alerts?pattern=MERCHANT_CASHOUT'),
      },
    ];
  }, [alerts, navigate]);

  const recentAlerts = useMemo(() => {
    return [...alerts]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [alerts]);

  const recentColumns: Column<Alert>[] = [
    {
      key: 'createdAt',
      title: 'Timestamp',
      width: '140px',
      render: (item) => (
        <span className="tabular-nums" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
          {new Date(item.createdAt).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'pattern',
      title: 'Pattern',
      render: (item) => (
        <span style={{ fontWeight: 500, color: 'var(--text)' }}>
          {item.pattern.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'severity',
      title: 'Severity',
      width: '90px',
      render: (item) => <SeverityBadge severity={item.severity} />,
    },
    {
      key: 'score',
      title: 'Score',
      width: '70px',
      render: (item) => <RiskBadge score={item.score} />,
    },
    {
      key: 'triageStatus',
      title: 'Triage',
      width: '100px',
      render: (item) => <TriageStatusBadge status={item.triageStatus} />,
    },
    {
      key: 'actions',
      title: 'Action',
      width: '80px',
      align: 'right',
      render: (item) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/alerts?selected=${item._id}`);
          }}
          aria-label="View alert in queue"
        >
          <span>View</span>
        </Button>
      ),
    },
  ];

  if (loading && alerts.length === 0) {
    return <StateView type="loading" title="Loading operational dashboard..." />;
  }

  if (error && alerts.length === 0) {
    return <StateView type="error" title="Dashboard error" description={error} onRetry={loadData} />;
  }

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <PageHeader
        kicker="01 — DASHBOARD"
        title="Operational Dashboard"
        subtitle="Graph-correlated fraud signals and coordinated fraud ring activity for analyst triage."
        actions={
          <Button variant="secondary" size="sm" onClick={loadData}>
            <Icon name="refresh" size={13} />
            <span>Refresh</span>
          </Button>
        }
      />

      {/* Live Feedback: ProgressStrip when analysis is running */}
      {isRunning && (
        <ProgressStrip
          currentStage={runStage}
          progressPercent={runProgress}
          label={runStageLabel}
        />
      )}

      {/* KPI Cards Grid */}
      <div className={styles.kpiGrid}>
        <MetricTile
          label="Total Alerts"
          value={totalAlertsCount}
          subtext={`${criticalAlertsCount} critical severity`}
          onClick={() => navigate('/alerts')}
        />
        <MetricTile
          label="Open Alerts"
          value={openAlertsCount}
          subtext="Awaiting analyst triage"
          onClick={() => navigate('/alerts?triageStatus=NEW')}
        />
        <MetricTile
          label="Fraud Rings"
          value={totalRingsCount}
          subtext="Coordinated clusters identified"
          onClick={() => navigate('/rings')}
        />
        <MetricTile
          label="Active Cases"
          value={openCasesCount}
          subtext="Under analyst investigation"
          onClick={() => navigate('/cases')}
        />
      </div>

      {/* Pictograph Analytics Grid: Risk Tiers & Detection Patterns */}
      <div className={styles.analyticsGrid}>
        <Card variant="default">
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--text)', margin: 0 }}>
              Alerts by Risk Tier
            </h2>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              Calibrated composite risk distribution
            </span>
          </div>
          <Pictograph rows={riskTierRows} unitName="alerts" />
        </Card>

        <Card variant="default">
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--text)', margin: 0 }}>
              Alerts by Detection Pattern
            </h2>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              Deterministic graph pattern breakdown
            </span>
          </div>
          <Pictograph rows={patternRows} unitName="alerts" />
        </Card>
      </div>

      {/* Ingestion & Engine Status */}
      <div className={styles.dataStatusGrid}>
        <Card variant="default">
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--text)', margin: 0 }}>
              Data Ingestion & Integrity
            </h2>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              Active dataset batch volume and processing state
            </span>
          </div>
          <div className={styles.statusMetrics}>
            <div className={styles.statusMetricItem}>
              <span className={styles.statusMetricLabel}>Batches</span>
              <span className={styles.statusMetricValue}>{batches.length}</span>
            </div>
            <div className={styles.statusMetricItem}>
              <span className={styles.statusMetricLabel}>Tx Records</span>
              <span className={styles.statusMetricValue}>
                {batches.reduce((acc, b) => acc + (b.acceptedRows ?? b.recordCount ?? 0), 0).toLocaleString()}
              </span>
            </div>
            <div className={styles.statusMetricItem}>
              <span className={styles.statusMetricLabel}>Ingestion Status</span>
              <span className={styles.statusMetricValue} style={{ fontSize: '12px', color: 'var(--sev-low-text)' }}>
                READY
              </span>
            </div>
          </div>
        </Card>

        <Card variant="default">
          <div className={styles.runActionBox}>
            <Button
              variant="primary"
              disabled={isRunning}
              onClick={handleTriggerAnalysis}
              fullWidth
            >
              <Icon name="play" size={13} />
              <span>{isRunning ? 'Analyzing...' : 'Run analysis'}</span>
            </Button>

            {runSuccess && <div className={styles.runSuccessNotice}>{runSuccess}</div>}
            {runError && <div className={styles.runErrorNotice}>{runError}</div>}
            {!runSuccess && !runError && (
              <div className={styles.runStatusNotice}>
                <span>Engine: Deterministic {rules?.ruleVersion ? `${rules.ruleVersion}` : ''}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Recent Activity Table */}
      <Card variant="default">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--text)', margin: 0 }}>
              Recent Flagged Activity
            </h2>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              Latest graph detections prioritized by timestamp
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/alerts')}>
            <span>View all ({alerts.length}) →</span>
          </Button>
        </div>

        <Table
          columns={recentColumns}
          data={recentAlerts}
          keyExtractor={(item) => item._id}
          onRowClick={(item) => navigate(`/alerts?selected=${item._id}`)}
          rowClassName={(item) => (item._id === highlightedAlertId ? styles.highlightRow : undefined)}
          emptyText="No recent alerts detected."
        />
      </Card>
    </div>
  );
};

export default DashboardPage;

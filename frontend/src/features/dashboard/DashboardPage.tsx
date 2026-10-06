import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { fetchAlerts, Alert } from '../../api/alertsApi';
import { fetchRings, FraudRing } from '../../api/ringsApi';
import { fetchCases, CaseItem } from '../../api/casesApi';
import { fetchDataBatches, DataBatch } from '../../api/dataApi';
import { runAnalysis, AnalysisRunSummary } from '../../api/analysisApi';
import { SeverityBadge } from '../../components/SeverityBadge';
import { RiskBadge } from '../../components/RiskBadge';
import { TriageStatusBadge } from '../../components/TriageStatusBadge';
import { Button } from '../../components/common/Button';
import { Table, Column } from '../../components/common/Table';
import { StateView } from '../../components/common/StateView';
import { Icon } from '../../components/common/Icons';
import { getToken } from '../../lib/tokens';
import { getSocket, AnalysisProgressPayload, AnalysisCompletedPayload } from '../../lib/socket';
import styles from './DashboardPage.module.css';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [rings, setRings] = useState<FraudRing[]>([]);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [batches, setBatches] = useState<DataBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Run analysis state
  const [isRunning, setIsRunning] = useState(false);
  const [runProgress, setRunProgress] = useState<string | null>(null);
  const [runSuccess, setRunSuccess] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [alertsRes, ringsRes, casesRes, batchesRes] = await Promise.all([
        fetchAlerts(),
        fetchRings(),
        fetchCases(),
        fetchDataBatches().catch(() => ({ batches: [], count: 0 })),
      ]);
      setAlerts(alertsRes.alerts || []);
      setRings(ringsRes.rings || []);
      setCases(casesRes.cases || []);
      setBatches(batchesRes.batches || []);
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
      setRunProgress('Running analysis...');
    };

    const handleProgress = (data: AnalysisProgressPayload) => {
      setIsRunning(true);
      if (data.stage === 'GRAPH_CONSTRUCTION') {
        setRunProgress(`Graph construction (${data.progress}% - ${data.nodeCount ?? 0} entities)`);
      } else if (data.stage === 'FRAUD_DETECTION') {
        setRunProgress(`Pattern detection (${data.progress}% - ${data.detectionCount ?? 0} patterns)`);
      } else if (data.stage === 'RING_GROUPING') {
        setRunProgress(`Ring clustering (${data.progress}% - ${data.ringCount ?? 0} rings)`);
      } else if (data.stage) {
        setRunProgress(`Stage: ${data.stage} (${data.progress}%)`);
      } else {
        setRunProgress('Running analysis...');
      }
    };

    const handleCompleted = (data: AnalysisCompletedPayload) => {
      setIsRunning(false);
      setRunProgress(null);
      const ringsCount = data?.summary?.totalRings ?? 'active';
      const alertsCount = data?.summary?.totalAlerts ?? '';
      setRunSuccess(`Completed: ${ringsCount} rings, ${alertsCount} alerts.`);
      loadData();
      setTimeout(() => setRunSuccess(null), 7000);
    };

    socket.on('analysis-started', handleStarted);
    socket.on('analysis-progress', handleProgress);
    socket.on('analysis-completed', handleCompleted);

    return () => {
      socket.off('analysis-started', handleStarted);
      socket.off('analysis-progress', handleProgress);
      socket.off('analysis-completed', handleCompleted);
    };
  }, []);

  const handleTriggerAnalysis = async () => {
    try {
      setIsRunning(true);
      setRunError(null);
      setRunSuccess(null);
      setRunProgress('Running analysis...');

      const response = await runAnalysis('MANUAL');
      setIsRunning(false);
      setRunProgress(null);

      const summary: AnalysisRunSummary | undefined = response?.summary;
      const ringsCount = summary?.totalRings ?? 'active';
      const alertsCount = summary?.totalAlerts ?? '';
      setRunSuccess(`Completed: ${ringsCount} rings, ${alertsCount} alerts.`);
      loadData();

      setTimeout(() => {
        setRunSuccess(null);
      }, 7000);
    } catch (err: unknown) {
      setIsRunning(false);
      setRunProgress(null);
      if (err && typeof err === 'object' && 'error' in err) {
        setRunError((err as { error: string }).error);
      } else {
        setRunError('Analysis run failed. Verify server status.');
      }
    }
  };

  // KPIs
  const totalAlertsCount = alerts.length;
  const criticalAlertsCount = alerts.filter((a) => a.severity === 'CRITICAL').length;

  const highRiskAccountsCount = useMemo(() => {
    const highRiskSet = new Set<string>();
    alerts.forEach((alert) => {
      if (alert.score >= 70 || alert.severity === 'HIGH' || alert.severity === 'CRITICAL') {
        const accounts = alert.evidence?.accounts || alert.evidence?.cycleAccounts || [];
        accounts.forEach((acc) => highRiskSet.add(acc));
        if (alert.evidence?.transactions) {
          alert.evidence.transactions.forEach((tx) => {
            if (tx.fromAccount) highRiskSet.add(tx.fromAccount);
            if (tx.toAccount) highRiskSet.add(tx.toAccount);
          });
        }
      }
    });
    return highRiskSet.size;
  }, [alerts]);

  const activeRingsCount = rings.filter((r) => r.status === 'ACTIVE').length;
  const totalRingsCount = rings.length;

  const openCasesCount = cases.filter(
    (c) => c.status === 'OPEN' || c.status === 'INVESTIGATING'
  ).length;

  // Risk Distribution Data
  const riskTierData = useMemo(() => {
    const counts = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    alerts.forEach((a) => {
      if (a.score >= 85) counts.Critical++;
      else if (a.score >= 70) counts.High++;
      else if (a.score >= 40) counts.Medium++;
      else counts.Low++;
    });
    return [
      { tier: 'Low', count: counts.Low, color: getToken('--sev-low') || 'var(--sev-low)' },
      { tier: 'Medium', count: counts.Medium, color: getToken('--sev-medium') || 'var(--sev-medium)' },
      { tier: 'High', count: counts.High, color: getToken('--sev-high') || 'var(--sev-high)' },
      { tier: 'Critical', count: counts.Critical, color: getToken('--sev-critical') || 'var(--sev-critical)' },
    ];
  }, [alerts]);

  // Detection Patterns Data
  const patternData = useMemo(() => {
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

    const formatName = (key: string) => {
      switch (key) {
        case 'CIRCULAR_FLOW': return 'Circular flow';
        case 'FAN_IN_FAN_OUT': return 'Fan-in / fan-out';
        case 'SHARED_DEVICE': return 'Shared device';
        case 'PASS_THROUGH': return 'Pass-through';
        case 'MERCHANT_CASHOUT': return 'Merchant cash-out';
        default: return key.replace(/_/g, ' ');
      }
    };

    return Object.entries(patternMap).map(([key, count]) => ({
      name: formatName(key),
      count,
    }));
  }, [alerts]);

  // Recent Activity (Alerts)
  const recentAlerts = useMemo(() => {
    return [...alerts]
      .sort((a, b) => new Date(b.createdAt).getTime() - a.createdAt.localeCompare(b.createdAt))
      .slice(0, 5);
  }, [alerts]);

  const recentColumns: Column<Alert>[] = [
    {
      key: 'createdAt',
      title: 'Timestamp',
      width: '140px',
      render: (item) => (
        <span className="tabular-nums" style={{ color: 'var(--text-2)' }}>
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
      render: () => (
        <Button
          variant="ghost"
          compact
          onClick={(e) => {
            e.stopPropagation();
            navigate('/alerts');
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
      {/* Header Row */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Operational Dashboard</h1>
          <p className={styles.subtitle}>
            Graph-correlated fraud signals and coordinated fraud ring activity for analyst triage.
          </p>
        </div>

        <Button variant="secondary" compact onClick={loadData}>
          <Icon name="refresh" size={13} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard} onClick={() => navigate('/alerts')}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Total Alerts</span>
            <Icon name="alerts" size={16} />
          </div>
          <div className={styles.kpiValue}>{totalAlertsCount}</div>
          <div className={styles.kpiMeta}>
            <span>{criticalAlertsCount} critical severity</span>
          </div>
        </div>

        <div className={styles.kpiCard} onClick={() => navigate('/alerts')}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>High-Risk Accounts</span>
            <Icon name="user" size={16} />
          </div>
          <div className={styles.kpiValue}>{highRiskAccountsCount}</div>
          <div className={styles.kpiMeta}>
            <span>Score &ge; 70 or high severity</span>
          </div>
        </div>

        <div className={styles.kpiCard} onClick={() => navigate('/rings')}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Fraud Rings</span>
            <Icon name="rings" size={16} />
          </div>
          <div className={styles.kpiValue}>{activeRingsCount}</div>
          <div className={styles.kpiMeta}>
            <span>{totalRingsCount} total clusters persisted</span>
          </div>
        </div>

        <div className={styles.kpiCard} onClick={() => navigate('/cases')}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>Open Cases</span>
            <Icon name="cases" size={16} />
          </div>
          <div className={styles.kpiValue}>{openCasesCount}</div>
          <div className={styles.kpiMeta}>
            <span>Active investigation workspaces</span>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className={styles.analyticsGrid}>
        {/* Risk Distribution Chart */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Risk Tier Distribution</h2>
            <span className={styles.cardSubtitle}>Alert severity buckets</span>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskTierData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <XAxis dataKey="tier" stroke="var(--text-3)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-3)" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '2px',
                    fontSize: '11px',
                    color: 'var(--text)',
                  }}
                  cursor={{ fill: 'var(--surface-2)' }}
                />
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                  {riskTierData.map((entry, index) => (
                    <Cell key={`tier-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detection Patterns Chart */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Detection Patterns</h2>
            <span className={styles.cardSubtitle}>Signal breakdown</span>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={patternData}
                margin={{ top: 8, right: 16, left: 24, bottom: 0 }}
              >
                <XAxis type="number" stroke="var(--text-3)" fontSize={11} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="var(--text-3)" fontSize={11} tickLine={false} width={110} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '2px',
                    fontSize: '11px',
                    color: 'var(--text)',
                  }}
                  cursor={{ fill: 'var(--surface-2)' }}
                />
                <Bar dataKey="count" fill="var(--primary)" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Data Status Card with Run Analysis Trigger */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Data Status &amp; Analysis Engine</h2>
          <span className={styles.cardSubtitle}>Graph state and execution trigger</span>
        </div>

        <div className={styles.dataStatusGrid}>
          <div className={styles.statusMetrics}>
            <div className={styles.statusMetricItem}>
              <span className={styles.statusMetricLabel}>Ingested Batches</span>
              <span className={styles.statusMetricValue}>{batches.length}</span>
            </div>
            <div className={styles.statusMetricItem}>
              <span className={styles.statusMetricLabel}>Total Alerts</span>
              <span className={styles.statusMetricValue}>{totalAlertsCount}</span>
            </div>
            <div className={styles.statusMetricItem}>
              <span className={styles.statusMetricLabel}>Active Rings</span>
              <span className={styles.statusMetricValue}>{activeRingsCount}</span>
            </div>
          </div>

          <div className={styles.runActionBox}>
            <Button
              variant="primary"
              compact
              onClick={handleTriggerAnalysis}
              disabled={isRunning}
              fullWidth
            >
              <Icon name="refresh" size={13} />
              <span>{isRunning ? 'Analyzing...' : 'Run analysis'}</span>
            </Button>

            {runProgress && (
              <div className={styles.runStatusNotice}>
                <span>{runProgress}</span>
              </div>
            )}

            {runSuccess && (
              <div className={styles.runSuccessNotice}>
                {runSuccess}
              </div>
            )}

            {runError && (
              <div className={styles.runErrorNotice}>
                {runError}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Recent Activity</h2>
          <span className={styles.cardSubtitle}>Latest detection alerts</span>
        </div>

        <Table
          columns={recentColumns}
          data={recentAlerts}
          keyExtractor={(item) => item._id}
          onRowClick={() => navigate('/alerts')}
          emptyMessage="No recent alerts detected. Ingest data batches or run analysis."
        />
      </div>
    </div>
  );
};

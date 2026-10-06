import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchAccountProfile,
  fetchAccountTransactions,
  AccountProfileResponse,
  AccountTransaction,
  AccountRiskContributor,
} from '../../api/accountsApi';
import { fetchNeighborhood, GraphNodeData, GraphEdgeData } from '../../api/graphApi';
import { Alert } from '../../api/alertsApi';
import { CytoscapeGraph } from '../../components/CytoscapeGraph';
import { RiskBadge } from '../../components/RiskBadge';
import { SeverityBadge } from '../../components/SeverityBadge';
import { TriageStatusBadge } from '../../components/TriageStatusBadge';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Table, Column } from '../../components/common/Table';
import { StateView } from '../../components/common/StateView';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { Icon } from '../../components/common/Icons';
import { CountUpText } from '../../components/motion/CountUpText';
import { formatCurrency, formatDateTime } from '../../lib/format';
import styles from './AccountDetailPage.module.css';

export const AccountDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<AccountProfileResponse | null>(null);
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [graphNodes, setGraphNodes] = useState<GraphNodeData[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdgeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [barsLoaded, setBarsLoaded] = useState(false);

  useEffect(() => {
    if (!id) return;

    async function loadAccountData() {
      try {
        setLoading(true);
        setError(null);
        const [profileRes, txRes] = await Promise.all([
          fetchAccountProfile(id!),
          fetchAccountTransactions(id!, 50),
        ]);

        setProfile(profileRes);
        setTransactions(txRes.transactions || []);

        // Fetch 1-hop neighborhood for account
        const extId = profileRes.account.externalId;
        const neighborhood = await fetchNeighborhood({ entityId: extId, depth: 1, limit: 30 });
        setGraphNodes(neighborhood.nodes || []);
        setGraphEdges(neighborhood.edges || []);

        setTimeout(() => setBarsLoaded(true), 150);
      } catch (err: unknown) {
        console.error('Failed to load account profile:', err);
        setError('Unable to load account profile.');
      } finally {
        setLoading(false);
      }
    }

    loadAccountData();
  }, [id]);

  const txColumns: Column<AccountTransaction>[] = [
    {
      key: 'timestamp',
      title: 'Timestamp',
      width: '130px',
      render: (tx) => (
        <span className="tabular-nums" style={{ color: 'var(--text-2)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
          {formatDateTime(tx.timestamp)}
        </span>
      ),
    },
    {
      key: 'type',
      title: 'Type',
      width: '90px',
      render: (tx) => <Badge variant="neutral">{tx.type}</Badge>,
    },
    {
      key: 'amount',
      title: 'Amount',
      width: '120px',
      align: 'right',
      render: (tx) => (
        <span className="tabular-nums" style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
          {formatCurrency(tx.amount)}
        </span>
      ),
    },
    {
      key: 'counterparty',
      title: 'Counterparty',
      render: (tx) => {
        const isOutbound =
          tx.fromAccount &&
          (tx.fromAccount._id === id || tx.fromAccount.externalId === profile?.account.externalId);
        if (isOutbound) {
          if (tx.toAccount) {
            return (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text)' }}>
                To: {tx.toAccount.externalId}
              </span>
            );
          }
          if (tx.merchant) {
            return (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text)' }}>
                Merchant: {tx.merchant.name || tx.merchant.externalId}
              </span>
            );
          }
        }
        return (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text)' }}>
            From: {tx.fromAccount?.externalId || '-'}
          </span>
        );
      },
    },
    {
      key: 'device',
      title: 'Device',
      width: '120px',
      render: (tx) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
          {tx.device?.externalId || '-'}
        </span>
      ),
    },
  ];

  const alertColumns: Column<Alert>[] = [
    {
      key: 'pattern',
      title: 'Pattern',
      render: (a) => (
        <span style={{ fontWeight: 500, color: 'var(--text)' }}>
          {a.pattern.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'severity',
      title: 'Severity',
      width: '90px',
      render: (a) => <SeverityBadge severity={a.severity} />,
    },
    {
      key: 'score',
      title: 'Score',
      width: '70px',
      render: (a) => <RiskBadge score={a.score} />,
    },
    {
      key: 'triageStatus',
      title: 'Triage',
      width: '95px',
      render: (a) => <TriageStatusBadge status={a.triageStatus} />,
    },
  ];

  if (loading) {
    return <StateView type="loading" title="Loading account investigation profile..." />;
  }

  if (error || !profile) {
    return (
      <StateView
        type="error"
        title="Account record not found"
        description={error || 'The requested account could not be found.'}
        onRetry={() => navigate('/alerts')}
      />
    );
  }

  const { account, latestRisk: risk } = profile;

  return (
    <div className={styles.container}>
      <PageHeader
        kicker="09 — ACCOUNT INVESTIGATION"
        breadcrumbs={[
          { label: 'Back', onClick: () => navigate(-1) },
          { label: `Account: ${account.externalId}` },
        ]}
        title={account.externalId}
        subtitle={`Account record associated with customer ${account.customerName || 'Anonymous Entity'}`}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            {risk && <RiskBadge score={risk.score} />}
            <Button variant="secondary" size="sm" onClick={() => navigate('/graph')}>
              <Icon name="graph" size={13} />
              <span>Explore in Graph</span>
            </Button>
          </div>
        }
      />

      {/* Account Meta Grid */}
      <div className={styles.metaGrid}>
        <div className={styles.metaBox}>
          <span className={styles.metaLabel}>Account Number</span>
          <span className={styles.metaValue}>{account.accountNumber || account.externalId}</span>
        </div>
        <div className={styles.metaBox}>
          <span className={styles.metaLabel}>Customer Name</span>
          <span className={styles.metaValue}>{account.customerName || 'Anonymous Entity'}</span>
        </div>
        <div className={styles.metaBox}>
          <span className={styles.metaLabel}>Risk Score</span>
          <span className={styles.metaValue}>
            <CountUpText value={risk?.score || 0} suffix=" / 100" />
          </span>
        </div>
        <div className={styles.metaBox}>
          <span className={styles.metaLabel}>Network Degree</span>
          <span className={styles.metaValue}>
            {profile.networkDegree
              ? `In: ${profile.networkDegree.inDegree} | Out: ${profile.networkDegree.outDegree}`
              : '—'}
          </span>
        </div>
      </div>

      {/* 1-Hop Neighborhood Graph */}
      <Card variant="default">
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
            Immediate 1-Hop Topology
          </h2>
          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
            Direct counterparty and device hardware connections
          </span>
        </div>

        <div className={styles.graphContainer}>
          <CytoscapeGraph
            nodes={graphNodes}
            edges={graphEdges}
            onNodeClick={(node) => {
              if (node.entityType === 'ACCOUNT' && node.externalId !== account.externalId) {
                navigate(`/accounts/${node.mongoId || node.externalId}`);
              }
            }}
          />
        </div>
      </Card>

      {/* Risk Signals & Explanations (Why Flagged?) */}
      <div className={styles.twoColGrid}>
        <Card variant="default">
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
              Why Flagged? (Risk Contributors)
            </h2>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              Deterministic scoring signals calibrated against behavioral norms
            </span>
          </div>

          {risk && risk.contributors && risk.contributors.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {risk.contributors.map((c: AccountRiskContributor, idx: number) => {
                const pts = c.pointsAwarded ?? c.score ?? 0;
                return (
                  <div key={idx} className={styles.contributorItem}>
                    <div className={styles.contributorHeader}>
                      <span className={styles.contributorName}>{c.signalName}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600, color: 'var(--sev-high)' }}>
                        +{pts} pts
                      </span>
                    </div>
                    <div className={styles.contributorBarTrack}>
                      <div
                        className={styles.contributorBarFill}
                        style={{
                          transform: barsLoaded ? `scaleX(${Math.min(1, pts / 40)})` : 'scaleX(0)',
                          transitionDelay: `${idx * 80}ms`,
                        }}
                      />
                    </div>
                    <div className={styles.contributorEvidence}>{c.evidence}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-3)', fontSize: '12px' }}>
              No risk contributors recorded for this account.
            </div>
          )}
        </Card>

        {/* Associated Alerts */}
        <Card variant="default">
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
              Associated Alerts ({profile.recentAlerts?.length || 0})
            </h2>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              Alert findings in which this account is an entity node
            </span>
          </div>

          <Table
            columns={alertColumns}
            data={profile.recentAlerts || []}
            keyExtractor={(a) => a._id}
            onRowClick={() => navigate('/alerts')}
            emptyText="No alerts directly attached to this account."
          />
        </Card>
      </div>

      {/* Transaction History Table */}
      <Card variant="default">
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
            Transaction History
          </h2>
          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
            Latest {transactions.length} ledger events
          </span>
        </div>

        <Table
          columns={txColumns}
          data={transactions}
          keyExtractor={(tx) => tx._id || tx.externalTransactionId}
          emptyText="No transaction records found for this account."
        />
      </Card>
    </div>
  );
};

export default AccountDetailPage;

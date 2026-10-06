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
import { Icon } from '../../components/common/Icons';
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
        <span className="tabular-nums" style={{ color: 'var(--text-2)' }}>
          {new Date(tx.timestamp).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'type',
      title: 'Type',
      width: '90px',
      render: (tx) => (
        <Badge variant="neutral">{tx.type}</Badge>
      ),
    },
    {
      key: 'amount',
      title: 'Amount',
      width: '110px',
      align: 'right',
      render: (tx) => (
        <span className="tabular-nums" style={{ fontWeight: 600 }}>
          ${Number(tx.amount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'counterparty',
      title: 'Counterparty',
      render: (tx) => {
        const isOutbound = tx.fromAccount && (tx.fromAccount._id === id || tx.fromAccount.externalId === profile?.account.externalId);
        if (isOutbound) {
          if (tx.toAccount) {
            return (
              <span className="entity-id" style={{ color: 'var(--text)' }}>
                To: {tx.toAccount.externalId}
              </span>
            );
          }
          if (tx.merchant) {
            return (
              <span className="entity-id" style={{ color: 'var(--text)' }}>
                Merchant: {tx.merchant.name || tx.merchant.externalId}
              </span>
            );
          }
        }
        return (
          <span className="entity-id" style={{ color: 'var(--text)' }}>
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
        <span className="entity-id" style={{ color: 'var(--text-3)' }}>
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
        <span style={{ fontWeight: 600, color: 'var(--text)' }}>
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
      width: '100px',
      render: (a) => <TriageStatusBadge status={a.triageStatus} />,
    },
  ];

  if (loading) {
    return <StateView type="loading" title="Loading account workspace..." />;
  }

  if (error || !profile) {
    return (
      <StateView
        type="error"
        title="Account not found"
        description={error || 'The requested account record does not exist.'}
        onRetry={() => navigate(-1)}
      />
    );
  }

  const account = profile.account;
  const risk = profile.latestRisk;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <div className={styles.breadcrumbs}>
            <button className={styles.backBtn} onClick={() => navigate(-1)}>
              <Icon name="arrowLeft" size={12} />
              <span>Back</span>
            </button>
            <span>/</span>
            <span>Account {account.externalId}</span>
          </div>

          <div className={styles.titleWithBadge}>
            <h1 className={styles.title}>{account.externalId}</h1>
            {risk && <RiskBadge score={risk.score} />}
          </div>
        </div>

        <Button variant="secondary" compact onClick={() => navigate('/graph')}>
          <Icon name="graph" size={13} />
          <span>Explore in Graph</span>
        </Button>
      </div>

      {/* Account Meta Grid */}
      <div className={styles.metaGrid}>
        <div className={styles.metaBox}>
          <span className={styles.metaLabel}>Account Number</span>
          <span className="entity-id">{account.accountNumber || account.externalId}</span>
        </div>
        <div className={styles.metaBox}>
          <span className={styles.metaLabel}>Customer Name</span>
          <span className={styles.metaValue}>{account.customerName || 'Anonymous Entity'}</span>
        </div>
        <div className={styles.metaBox}>
          <span className={styles.metaLabel}>Ring Membership</span>
          <span className={styles.metaValue}>
            {profile.ringMemberships && profile.ringMemberships.length > 0 ? (
              <button
                onClick={() => navigate(`/rings/${profile.ringMemberships[0].ringId._id}`)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'var(--primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {profile.ringMemberships[0].ringId.label || 'Active Ring'}
              </button>
            ) : (
              'None'
            )}
          </span>
        </div>
        <div className={styles.metaBox}>
          <span className={styles.metaLabel}>Created Date</span>
          <span className="tabular-nums" style={{ color: 'var(--text-2)' }}>
            {account.createdAt ? new Date(account.createdAt).toLocaleDateString() : '-'}
          </span>
        </div>
      </div>

      {/* 1-Hop Neighborhood Graph */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Immediate 1-Hop Topology</h2>
          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
            Direct counterparty and device connections
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
      </div>

      {/* Risk Signals & Explanations (Why Flagged?) */}
      <div className={styles.twoColGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Why Flagged? (Risk Contributors)</h2>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              Deterministic scoring signals
            </span>
          </div>

          {risk && risk.contributors && risk.contributors.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {risk.contributors.map((c: AccountRiskContributor, idx: number) => (
                <div key={idx} className={styles.contributorItem}>
                  <div className={styles.contributorHeader}>
                    <span className={styles.contributorName}>{c.signalName}</span>
                    <span className="tabular-nums" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--sev-high)' }}>
                      +{c.pointsAwarded ?? c.score} pts
                    </span>
                  </div>
                  <div className={styles.contributorEvidence}>{c.evidence}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-3)', fontSize: '12px' }}>
              No risk contributors recorded for this account.
            </div>
          )}
        </div>

        {/* Recent Alerts */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Associated Alerts</h2>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              {profile.recentAlerts?.length || 0} alerts
            </span>
          </div>

          <Table
            columns={alertColumns}
            data={profile.recentAlerts || []}
            keyExtractor={(a) => a._id}
            onRowClick={() => navigate('/alerts')}
            emptyMessage="No alerts directly attached to this account."
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Transaction History</h2>
          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
            Latest {transactions.length} transactions
          </span>
        </div>

        <Table
          columns={txColumns}
          data={transactions}
          keyExtractor={(tx) => tx._id || tx.externalTransactionId}
          emptyMessage="No transaction records found for this account."
        />
      </div>
    </div>
  );
};

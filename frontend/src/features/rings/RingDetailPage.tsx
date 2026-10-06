import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchRingById, FraudRingDetail, FraudRingMember } from '../../api/ringsApi';
import { Alert } from '../../api/alertsApi';
import { CytoscapeGraph } from '../../components/CytoscapeGraph';
import { RiskBadge } from '../../components/RiskBadge';
import { SeverityBadge } from '../../components/SeverityBadge';
import { TriageStatusBadge } from '../../components/TriageStatusBadge';
import { Badge } from '../../components/common/Badge';
import { Button, LinkButton } from '../../components/common/Button';
import { Table, Column } from '../../components/common/Table';
import { StateView } from '../../components/common/StateView';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { Icon } from '../../components/common/Icons';
import { CountUpText } from '../../components/motion/CountUpText';
import { GraphNodeData, GraphEdgeData } from '../../api/graphApi';
import { formatCurrency, formatDateTime } from '../../lib/format';
import styles from './RingDetailPage.module.css';

export const RingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [ring, setRing] = useState<FraudRingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [barsLoaded, setBarsLoaded] = useState(false);

  const [graphNodes, setGraphNodes] = useState<GraphNodeData[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdgeData[]>([]);

  useEffect(() => {
    if (!id) return;

    async function loadRing() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchRingById(id!);
        setRing(res.ring);

        // Build subgraph from members and alert evidence
        const nodesMap = new Map<string, GraphNodeData>();
        const edgesList: GraphEdgeData[] = [];

        (res.ring.members || []).forEach((m) => {
          const entity = typeof m.entityId === 'object' ? (m.entityId as Record<string, string>) : null;
          const extId =
            entity?.externalAccountId ||
            entity?.externalDeviceId ||
            entity?.externalMerchantId ||
            entity?.externalId ||
            String(m.entityId);
          const mongoId = entity?._id || String(m.entityId);

          const key = `${m.entityType}:${extId}`;
          if (!nodesMap.has(key)) {
            nodesMap.set(key, {
              id: extId,
              key,
              mongoId,
              externalId: extId,
              entityType: m.entityType,
            });
          }
        });

        (res.ring.alerts || []).forEach((a) => {
          (a.evidence.transactions || []).forEach((tx) => {
            const sourceKey = `ACCOUNT:${tx.fromAccount}`;
            const targetKey = tx.toAccount ? `ACCOUNT:${tx.toAccount}` : `MERCHANT:${tx.merchant}`;

            if (tx.fromAccount && !nodesMap.has(sourceKey)) {
              nodesMap.set(sourceKey, {
                id: tx.fromAccount,
                key: sourceKey,
                mongoId: tx.fromAccount,
                externalId: tx.fromAccount,
                entityType: 'ACCOUNT',
              });
            }

            const targetId = tx.toAccount || tx.merchant;
            if (targetId && !nodesMap.has(targetKey)) {
              nodesMap.set(targetKey, {
                id: targetId,
                key: targetKey,
                mongoId: targetId,
                externalId: targetId,
                entityType: tx.toAccount ? 'ACCOUNT' : 'MERCHANT',
              });
            }

            if (tx.fromAccount && targetId) {
              edgesList.push({
                id: tx.externalTransactionId || `${sourceKey}->${targetKey}`,
                source: sourceKey,
                target: targetKey,
                type: tx.toAccount ? 'TRANSFER' : 'PAYMENT',
                amount: tx.amount,
                timestamp: tx.timestamp,
                externalTransactionId: tx.externalTransactionId,
              });
            }

            if (tx.device && tx.fromAccount) {
              const devKey = `DEVICE:${tx.device}`;
              if (!nodesMap.has(devKey)) {
                nodesMap.set(devKey, {
                  id: tx.device,
                  key: devKey,
                  mongoId: tx.device,
                  externalId: tx.device,
                  entityType: 'DEVICE',
                });
              }
              edgesList.push({
                id: `dev-${tx.fromAccount}-${tx.device}`,
                source: sourceKey,
                target: devKey,
                type: 'USED_DEVICE',
              });
            }
          });
        });

        setGraphNodes(Array.from(nodesMap.values()));
        setGraphEdges(edgesList);

        // Animate bars on load
        setTimeout(() => setBarsLoaded(true), 150);
      } catch (err: unknown) {
        console.error('Failed to load ring detail:', err);
        setError('Unable to load fraud ring workspace.');
      } finally {
        setLoading(false);
      }
    }

    loadRing();
  }, [id]);

  const memberColumns: Column<FraudRingMember>[] = [
    {
      key: 'entityType',
      title: 'Type',
      width: '100px',
      render: (m) => (
        <Badge variant={m.entityType === 'ACCOUNT' ? 'neutral' : 'medium'}>
          {m.entityType}
        </Badge>
      ),
    },
    {
      key: 'entityId',
      title: 'Identifier',
      render: (m) => {
        const entity = typeof m.entityId === 'object' ? (m.entityId as Record<string, string>) : null;
        const extId =
          entity?.externalAccountId ||
          entity?.externalDeviceId ||
          entity?.externalMerchantId ||
          entity?.externalId ||
          String(m.entityId);
        const mongoId = entity?._id || String(m.entityId);

        if (m.entityType === 'ACCOUNT') {
          return (
            <LinkButton
              to={`/accounts/${mongoId}`}
              variant="ghost"
              size="sm"
            >
              <span style={{ fontFamily: 'var(--font-mono)' }}>{extId}</span>
            </LinkButton>
          );
        }
        return <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{extId}</span>;
      },
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
      width: '100px',
      render: (a) => <TriageStatusBadge status={a.triageStatus} />,
    },
    {
      key: 'createdAt',
      title: 'Detected',
      width: '110px',
      render: (a) => (
        <span className="tabular-nums" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
          {formatDateTime(a.createdAt)}
        </span>
      ),
    },
  ];

  if (loading) {
    return <StateView type="loading" title="Loading fraud ring details..." />;
  }

  if (error || !ring) {
    return (
      <StateView
        type="error"
        title="Fraud ring not found"
        description={error || 'The requested fraud ring record does not exist.'}
        onRetry={() => navigate('/rings')}
      />
    );
  }

  return (
    <div className={styles.container}>
      {/* Breadcrumb + PageHeader */}
      <div>
        <PageHeader
          kicker="03 — FRAUD RING DETAIL"
          breadcrumbs={[
            { label: 'All Rings', onClick: () => navigate('/rings') },
            { label: ring.label },
          ]}
          title={ring.label}
          subtitle={`Coordinated fraud cluster involving ${ring.members?.length || 0} entities and ${ring.transactionCount || 0} transactions.`}
          actions={
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <Badge variant={ring.status === 'ACTIVE' ? 'high' : 'neutral'}>
                {ring.status}
              </Badge>
              <RiskBadge score={ring.score} />
              <Button variant="secondary" size="sm" onClick={() => navigate('/graph')}>
                <Icon name="graph" size={13} />
                <span>Open in Graph Explorer</span>
              </Button>
            </div>
          }
        />
      </div>

      {/* Meta Statistics Grid */}
      <div className={styles.metaGrid}>
        <div className={styles.metaBox}>
          <span className={styles.metaLabel}>Coordinated Flow</span>
          <span className={styles.metaValue}>
            {formatCurrency(ring.totalFlow)}
          </span>
        </div>
        <div className={styles.metaBox}>
          <span className={styles.metaLabel}>Transactions</span>
          <span className={styles.metaValue}>
            <CountUpText value={ring.transactionCount || 0} />
          </span>
        </div>
        <div className={styles.metaBox}>
          <span className={styles.metaLabel}>Ring Members</span>
          <span className={styles.metaValue}>
            <CountUpText value={ring.members?.length || 0} />
          </span>
        </div>
        <div className={styles.metaBox}>
          <span className={styles.metaLabel}>Risk Score</span>
          <span className={styles.metaValue}>
            <CountUpText value={ring.score || 0} suffix=" / 100" />
          </span>
        </div>
      </div>

      {/* Topology Subgraph */}
      <Card variant="default">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
              Ring Network Topology
            </h2>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              Interactive local cluster subgraph
            </span>
          </div>
        </div>

        <div className={styles.graphContainer}>
          <CytoscapeGraph
            nodes={graphNodes}
            edges={graphEdges}
            onNodeClick={(node) => {
              if (node.entityType === 'ACCOUNT') {
                navigate(`/accounts/${node.mongoId || node.externalId}`);
              }
            }}
          />
        </div>
      </Card>

      {/* Contributor Signals (Why Flagged?) */}
      <Card variant="default">
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
            Why Flagged? (Topological Signals)
          </h2>
          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
            Deterministic pattern evidence detected across the entity cluster
          </span>
        </div>

        <div className={styles.contributorList}>
          {ring.patterns.map((p, idx) => (
            <div key={p} className={styles.contributorItem}>
              <div className={styles.contributorHeader}>
                <span>{p.replace(/_/g, ' ')}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent)' }}>
                  Detected
                </span>
              </div>
              <div className={styles.contributorBarTrack}>
                <div
                  className={styles.contributorBarFill}
                  style={{
                    transform: barsLoaded ? 'scaleX(1)' : 'scaleX(0)',
                    transitionDelay: `${idx * 100}ms`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Members & Alerts Table Grid */}
      <div className={styles.detailGrid}>
        <Card variant="default">
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
              Ring Members ({ring.members?.length || 0})
            </h2>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              Linked accounts, hardware devices, and merchants
            </span>
          </div>

          <Table
            columns={memberColumns}
            data={ring.members || []}
            keyExtractor={(m, idx) => `${m.entityType}-${idx}`}
            emptyText="No member entities recorded in this ring."
          />
        </Card>

        <Card variant="default">
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
              Correlated Alerts ({ring.alerts?.length || 0})
            </h2>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              Individual detector signals clustered into this dossier
            </span>
          </div>

          <Table
            columns={alertColumns}
            data={ring.alerts || []}
            keyExtractor={(a) => a._id}
            onRowClick={() => navigate('/alerts')}
            emptyText="No alerts attached to this ring."
          />
        </Card>
      </div>
    </div>
  );
};

export default RingDetailPage;

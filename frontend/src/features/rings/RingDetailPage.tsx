import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchRingById, FraudRingDetail, FraudRingMember } from '../../api/ringsApi';
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
import { GraphNodeData, GraphEdgeData } from '../../api/graphApi';
import styles from './RingDetailPage.module.css';

export const RingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [ring, setRing] = useState<FraudRingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            <button
              onClick={() => navigate(`/accounts/${mongoId}`)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: 'var(--primary)',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
              className="entity-id"
            >
              {extId}
            </button>
          );
        }
        return <span className="entity-id">{extId}</span>;
      },
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
    {
      key: 'createdAt',
      title: 'Detected',
      width: '110px',
      render: (a) => (
        <span className="tabular-nums" style={{ color: 'var(--text-3)' }}>
          {new Date(a.createdAt).toLocaleDateString()}
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
      {/* Header */}
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <div className={styles.breadcrumbs}>
            <button className={styles.backBtn} onClick={() => navigate('/rings')}>
              <Icon name="arrowLeft" size={12} />
              <span>All Rings</span>
            </button>
            <span>/</span>
            <span>{ring.label}</span>
          </div>

          <div className={styles.titleWithBadges}>
            <h1 className={styles.title}>{ring.label}</h1>
            <Badge variant={ring.status === 'ACTIVE' ? 'high' : 'neutral'}>
              {ring.status}
            </Badge>
            <RiskBadge score={ring.score} />
          </div>
        </div>

        <Button variant="secondary" compact onClick={() => navigate('/graph')}>
          <Icon name="graph" size={13} />
          <span>Open in Graph Explorer</span>
        </Button>
      </div>

      {/* Meta Statistics Grid */}
      <div className={styles.metaGrid}>
        <div className={styles.metaBox}>
          <span className={styles.metaLabel}>Coordinated Flow</span>
          <span className={styles.metaValue}>
            ${Number(ring.totalFlow || 0).toLocaleString()}
          </span>
        </div>
        <div className={styles.metaBox}>
          <span className={styles.metaLabel}>Transactions</span>
          <span className={styles.metaValue}>{ring.transactionCount || 0}</span>
        </div>
        <div className={styles.metaBox}>
          <span className={styles.metaLabel}>Ring Members</span>
          <span className={styles.metaValue}>{ring.members?.length || 0}</span>
        </div>
        <div className={styles.metaBox}>
          <span className={styles.metaLabel}>Associated Alerts</span>
          <span className={styles.metaValue}>{ring.alerts?.length || 0}</span>
        </div>
      </div>

      {/* Ring Topology Subgraph */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Ring Network Topology</h2>
          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
            Interactive local cluster
          </span>
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
      </div>

      {/* Details Grid: Members & Alerts */}
      <div className={styles.detailGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Ring Members</h2>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              {ring.members?.length || 0} linked entities
            </span>
          </div>

          <Table
            columns={memberColumns}
            data={ring.members || []}
            keyExtractor={(m, idx) => `${m.entityType}-${idx}`}
            emptyMessage="No member entities recorded in this ring."
          />
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Correlated Alerts</h2>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              {ring.alerts?.length || 0} alerts
            </span>
          </div>

          <Table
            columns={alertColumns}
            data={ring.alerts || []}
            keyExtractor={(a) => a._id}
            onRowClick={() => navigate('/alerts')}
            emptyMessage="No alerts attached to this ring."
          />
        </div>
      </div>
    </div>
  );
};

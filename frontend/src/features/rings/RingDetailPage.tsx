import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { fetchRingById, FraudRingDetail } from '../../api/ringsApi';
import { CytoscapeGraph } from '../../components/CytoscapeGraph';
import { RiskBadge } from '../../components/RiskBadge';
import { GraphNodeData, GraphEdgeData } from '../../api/graphApi';

export const RingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ring, setRing] = useState<FraudRingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Graph state for the ring's entities
  const [graphNodes, setGraphNodes] = useState<GraphNodeData[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdgeData[]>([]);

  useEffect(() => {
    if (!id) return;

    async function loadRing() {
      try {
        setLoading(true);
        const res = await fetchRingById(id!);
        setRing(res.ring);

        // Build subgraph from members and alert evidence transactions
        const nodesMap = new Map<string, GraphNodeData>();
        const edgesList: GraphEdgeData[] = [];

        // Add member nodes
        (res.ring.members || []).forEach((m) => {
          const entity = typeof m.entityId === 'object' ? m.entityId : null;
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

        // Add edges from transactions in the related alerts
        (res.ring.alerts || []).forEach((a) => {
          (a.evidence.transactions || []).forEach((tx: any) => {
            const sourceKey = `ACCOUNT:${tx.fromAccount}`;
            const targetKey = tx.toAccount ? `ACCOUNT:${tx.toAccount}` : `MERCHANT:${tx.merchant}`;

            // Ensure source node exists
            if (!nodesMap.has(sourceKey)) {
              nodesMap.set(sourceKey, {
                id: tx.fromAccount,
                key: sourceKey,
                mongoId: tx.fromAccount,
                externalId: tx.fromAccount,
                entityType: 'ACCOUNT',
              });
            }

            // Ensure target node exists
            if (!nodesMap.has(targetKey)) {
              nodesMap.set(targetKey, {
                id: tx.toAccount || tx.merchant,
                key: targetKey,
                mongoId: tx.toAccount || tx.merchant,
                externalId: tx.toAccount || tx.merchant,
                entityType: tx.toAccount ? 'ACCOUNT' : 'MERCHANT',
              });
            }

            edgesList.push({
              id: tx.externalTransactionId,
              source: sourceKey,
              target: targetKey,
              type: tx.toAccount ? 'TRANSFER' : 'PAYMENT',
              amount: tx.amount,
              timestamp: tx.timestamp,
              externalTransactionId: tx.externalTransactionId,
            });

            // If device present, add device edge
            if (tx.device) {
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
                id: `${sourceKey}->${devKey}`,
                source: sourceKey,
                target: devKey,
                type: 'USED_DEVICE',
              });
            }
          });
        });

        setGraphNodes(Array.from(nodesMap.values()));
        setGraphEdges(edgesList);
      } catch (err) {
        console.error('Failed to load ring detail:', err);
      } finally {
        setLoading(false);
      }
    }

    loadRing();
  }, [id]);

  if (loading) {
    return <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Loading fraud ring details...</div>;
  }

  if (!ring) {
    return <div style={{ padding: '40px', color: 'var(--danger)' }}>Fraud ring not found.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Back button and Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={() => navigate('/rings')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--bg-surface-elevated)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.84rem',
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Rings</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#fff' }}>{ring.label}</h1>
          <span
            style={{
              fontSize: '0.76rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: ring.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
              color: ring.status === 'ACTIVE' ? '#10b981' : '#94a3b8',
            }}
          >
            {ring.status}
          </span>
          <RiskBadge score={ring.score} size="md" />
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Coordinated Money Flow</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginTop: '6px' }}>
            ${ring.totalFlow.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Deduplicated across alerts</span>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Network Entities</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginTop: '6px' }}>
            {ring.members.length}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Accounts, Devices & Merchants</span>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Detected Patterns</span>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '8px' }}>
            {ring.patterns.join(', ')}
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Unique Transactions</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginTop: '6px' }}>
            {ring.transactionCount}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Evidence verified</span>
        </div>
      </div>

      {/* Ring Graph Visualization */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>Ring Network Subgraph</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Interactive topology of accounts, devices, and cash-out points participating in this fraud ring.
            </p>
          </div>
        </div>

        <CytoscapeGraph
          nodes={graphNodes}
          edges={graphEdges}
          height="450px"
          onNodeClick={(node) => {
            if (node.entityType === 'ACCOUNT') {
              navigate(`/accounts/${node.mongoId || node.externalId}`);
            }
          }}
        />
      </div>

      {/* Two Column Section: Contributing Risk Signals & Members Roster */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px' }}>
        {/* Contributing Risk Signals Breakdown */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
          }}
        >
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>
            Explainable Risk Contributors
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {ring.contributors.map((c, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.88rem' }}>{c.signalName}</span>
                  <span style={{ color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '0.88rem' }}>
                    +{c.score} pts
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {c.evidence}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Category: {c.category} · Cap: {c.weight} pts
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Member Entities Roster */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
          }}
        >
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>
            Ring Members ({ring.members.length})
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ring.members.map((m) => {
              const entity = typeof m.entityId === 'object' ? m.entityId : null;
              const extId =
                entity?.externalAccountId ||
                entity?.externalDeviceId ||
                entity?.externalMerchantId ||
                entity?.externalId ||
                String(m.entityId);
              const mongoId = entity?._id || String(m.entityId);

              return (
                <div
                  key={m._id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor:
                            m.entityType === 'ACCOUNT'
                              ? 'rgba(56, 189, 248, 0.15)'
                              : m.entityType === 'DEVICE'
                              ? 'rgba(192, 132, 252, 0.15)'
                              : 'rgba(52, 211, 153, 0.15)',
                          color:
                            m.entityType === 'ACCOUNT'
                              ? '#38bdf8'
                              : m.entityType === 'DEVICE'
                              ? '#c084fc'
                              : '#34d399',
                        }}
                      >
                        {m.entityType}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#fff', fontSize: '0.88rem' }}>
                        {extId}
                      </span>
                    </div>
                  </div>

                  {m.entityType === 'ACCOUNT' && (
                    <button
                      onClick={() => navigate(`/accounts/${mongoId}`)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: 'transparent',
                        color: 'var(--accent-cyan)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                      }}
                    >
                      <span>Investigate</span>
                      <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

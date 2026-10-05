import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';
import {
  fetchAccountProfile,
  fetchAccountTransactions,
  AccountProfileResponse,
  AccountTransaction,
} from '../../api/accountsApi';
import { fetchNeighborhood, GraphNodeData, GraphEdgeData } from '../../api/graphApi';
import { CytoscapeGraph } from '../../components/CytoscapeGraph';
import { RiskBadge } from '../../components/RiskBadge';

export const AccountDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<AccountProfileResponse | null>(null);
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [graphNodes, setGraphNodes] = useState<GraphNodeData[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdgeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function loadAccountData() {
      try {
        setLoading(true);
        const [profileRes, txRes] = await Promise.all([
          fetchAccountProfile(id!),
          fetchAccountTransactions(id!, 50),
        ]);

        setProfile(profileRes);
        setTransactions(txRes.transactions || []);

        // Load neighborhood graph for account
        const extId = profileRes.account.externalId;
        const neighborhood = await fetchNeighborhood({ entityId: extId, depth: 1, limit: 30 });
        setGraphNodes(neighborhood.nodes || []);
        setGraphEdges(neighborhood.edges || []);
      } catch (err) {
        console.error('Failed to load account details:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAccountData();
  }, [id]);

  if (loading) {
    return <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Loading account profile...</div>;
  }

  if (!profile) {
    return <div style={{ padding: '40px', color: 'var(--danger)' }}>Account profile not found.</div>;
  }

  const account = profile.account;
  const risk = profile.latestRisk;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header and Back navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={() => navigate(-1)}
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
          <span>Back</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>
            {account.externalId}
          </h1>
          {risk && <RiskBadge score={risk.score} size="md" />}
        </div>
      </div>

      {/* Account Info and Ring Memberships Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '18px',
          }}
        >
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Account Identifier</span>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
            {account.externalId}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Internal ID: {account._id}
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '18px',
          }}
        >
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Syndicate Membership</span>
          <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {profile.ringMemberships && profile.ringMemberships.length > 0 ? (
              profile.ringMemberships.map((rm) => (
                <button
                  key={rm._id}
                  onClick={() => navigate(`/rings/${rm.ringId._id}`)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(0, 210, 255, 0.12)',
                    color: 'var(--accent-cyan)',
                    border: '1px solid rgba(0, 210, 255, 0.3)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                  }}
                >
                  <span>{rm.ringId.label}</span>
                  <ExternalLink size={12} />
                </button>
              ))
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No fraud ring memberships</span>
            )}
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '18px',
          }}
        >
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Recent Alert Count</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
            {profile.recentAlerts?.length || 0} alerts
          </div>
        </div>
      </div>

      {/* "Why Flagged?" & Explainable Contributor Signals */}
      {risk && (
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', marginBottom: '12px' }}>
            Why Flagged? (Explainable Risk Assessment)
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {risk.whyFlagged?.map((reason, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '10px 14px',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#fca5a5',
                  fontSize: '0.85rem',
                }}
              >
                <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{reason}</span>
              </div>
            ))}
          </div>

          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '20px', marginBottom: '10px' }}>
            Signal Contributions (with Explicit Category Caps)
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
            {risk.contributors?.map((c, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.85rem' }}>{c.signalName}</span>
                  <span style={{ color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '0.88rem' }}>
                    +{c.pointsAwarded || c.score} pts
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {c.evidence}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Category: {c.category} · Cap: {c.maxCap || c.weight} pts
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Account Neighborhood Subgraph */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
        }}
      >
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', marginBottom: '12px' }}>
          Account 1-Hop Neighborhood
        </h2>
        <CytoscapeGraph
          nodes={graphNodes}
          edges={graphEdges}
          height="400px"
          highlightNodeId={account.externalId}
          onNodeClick={(node) => {
            if (node.entityType === 'ACCOUNT' && node.externalId !== account.externalId) {
              navigate(`/accounts/${node.mongoId || node.externalId}`);
            }
          }}
        />
      </div>

      {/* Chronological Transaction History */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>
            Transaction History ({transactions.length})
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Full chronological flow with entity destination, amount, and timestamp provenance.
          </p>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Tx ID</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Direction</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Counterparty</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Amount</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Device</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No transactions recorded for this account.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const isOutbound = tx.fromAccount?.externalId === account.externalId;
                const counterparty = isOutbound
                  ? tx.toAccount?.externalId || tx.merchant?.externalId || 'Unknown'
                  : tx.fromAccount?.externalId || 'Unknown';

                return (
                  <tr key={tx._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                      {tx.externalTransactionId}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: isOutbound ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: isOutbound ? '#f87171' : '#34d399',
                        }}
                      >
                        {isOutbound ? 'OUTBOUND' : 'INBOUND'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#fff', fontFamily: 'var(--font-mono)' }}>
                      {counterparty}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#fff' }}>
                      ${tx.amount.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {tx.device?.externalId || 'N/A'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                      {tx.timestamp}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

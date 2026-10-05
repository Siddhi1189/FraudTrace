import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, ArrowRight } from 'lucide-react';
import { fetchRings, FraudRing } from '../../api/ringsApi';
import { RiskBadge } from '../../components/RiskBadge';

export const RingsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [rings, setRings] = useState<FraudRing[]>([]);
  const [, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ACTIVE');

  const loadRings = async () => {
    try {
      setLoading(true);
      const res = await fetchRings(statusFilter !== 'ALL' ? statusFilter : undefined);
      setRings(res.rings || []);
    } catch (err) {
      console.error('Failed to load rings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRings();
  }, [statusFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#fff' }}>Fraud Rings</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Coordinated multi-entity fraud networks grouped from related detector findings without evidence double-counting.
          </p>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={15} color="var(--text-muted)" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              fontSize: '0.82rem',
            }}
          >
            <option value="ACTIVE">Active Rings Only</option>
            <option value="DISSOLVED">Dissolved / Historical Rings</option>
            <option value="ALL">All Rings</option>
          </select>
        </div>
      </div>

      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Ring Label</th>
              <th style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Risk Score</th>
              <th style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Patterns</th>
              <th style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Members</th>
              <th style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Coordinated Flow</th>
              <th style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Tx Count</th>
              <th style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 600 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rings.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No fraud rings found for current status filter.
                </td>
              </tr>
            ) : (
              rings.map((ring) => (
                <tr
                  key={ring._id}
                  onClick={() => navigate(`/rings/${ring._id}`)}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{ring.label}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {ring.fingerprint}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: ring.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                        color: ring.status === 'ACTIVE' ? '#10b981' : '#94a3b8',
                      }}
                    >
                      {ring.status}
                    </span>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <RiskBadge score={ring.score} size="sm" />
                  </td>

                  <td style={{ padding: '14px 16px', color: '#fff' }}>
                    {ring.patterns.join(', ')}
                  </td>

                  <td style={{ padding: '14px 16px', color: '#fff' }}>
                    {ring.memberCount || 0} entities
                  </td>

                  <td style={{ padding: '14px 16px', color: '#fff', fontWeight: 600 }}>
                    ${ring.totalFlow.toLocaleString()}
                  </td>

                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                    {ring.transactionCount}
                  </td>

                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/rings/${ring._id}`);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-surface-elevated)',
                        color: 'var(--text-primary)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        border: '1px solid var(--border-color)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>Investigate</span>
                      <ArrowRight size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

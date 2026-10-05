import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Network,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { fetchAlerts, Alert } from '../../api/alertsApi';
import { fetchRings, FraudRing } from '../../api/ringsApi';
import { SeverityBadge } from '../../components/SeverityBadge';
import { RiskBadge } from '../../components/RiskBadge';
import { TriageStatusBadge } from '../../components/TriageStatusBadge';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [rings, setRings] = useState<FraudRing[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [alertsRes, ringsRes] = await Promise.all([
        fetchAlerts(),
        fetchRings(),
      ]);
      setAlerts(alertsRes.alerts || []);
      setRings(ringsRes.rings || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleRefresh = () => loadData();
    window.addEventListener('fraudtrace:analysis-completed', handleRefresh);
    return () => window.removeEventListener('fraudtrace:analysis-completed', handleRefresh);
  }, []);

  // Compute metrics
  const totalAlerts = alerts.length;
  const criticalAlerts = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const activeRings = rings.filter((r) => r.status === 'ACTIVE').length;
  const dissolvedRings = rings.filter((r) => r.status === 'DISSOLVED').length;

  // Patterns distribution
  const patternCounts: Record<string, number> = {};
  alerts.forEach((a) => {
    patternCounts[a.pattern] = (patternCounts[a.pattern] || 0) + 1;
  });

  const patternData = Object.entries(patternCounts).map(([pattern, count]) => ({
    pattern: pattern.replace(/_/g, ' '),
    count,
  }));

  // Risk tier distribution
  const tierCounts = {
    Low: 0,
    Medium: 0,
    High: 0,
    Critical: 0,
  };
  alerts.forEach((a) => {
    if (a.score >= 85) tierCounts.Critical++;
    else if (a.score >= 70) tierCounts.High++;
    else if (a.score >= 40) tierCounts.Medium++;
    else tierCounts.Low++;
  });

  const tierColors: Record<string, string> = {
    Critical: '#ef4444',
    High: '#f97316',
    Medium: '#f59e0b',
    Low: '#10b981',
  };

  const riskData = Object.entries(tierCounts).map(([tier, count]) => ({
    tier,
    count,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          background: 'linear-gradient(135deg, rgba(18, 23, 34, 0.9) 0%, rgba(26, 34, 52, 0.8) 100%)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
            Investigation Overview
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Graph-correlated fraud signals and coordinated syndicate activity for analyst triage.
          </p>
        </div>

        <button
          onClick={loadData}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-surface-elevated)',
            color: 'var(--text-secondary)',
            padding: '8px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            fontSize: '0.82rem',
            fontWeight: 500,
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin-animate' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div
          onClick={() => navigate('/alerts')}
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            cursor: 'pointer',
            transition: 'border-color 0.2s',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Alerts</span>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', margin: '12px 0 4px' }}>
            {totalAlerts}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#f87171' }}>
            {criticalAlerts} Critical Severity
          </div>
        </div>

        <div
          onClick={() => navigate('/rings')}
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Active Fraud Rings</span>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(0, 210, 255, 0.15)', color: 'var(--accent-cyan)' }}>
              <Network size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', margin: '12px 0 4px' }}>
            {activeRings}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {dissolvedRings} Dissolved / Historical
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Risk Evaluation</span>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', margin: '12px 0 4px' }}>
            V1 Deterministic
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Explainable Signal Breakdown
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Analyst Platform</span>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <ShieldCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', margin: '12px 0 4px' }}>
            100%
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Evaluated on synthetic benchmark
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        {/* Risk Distribution Chart */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
          }}
        >
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>
            Alert Risk Tier Distribution
          </h2>
          <div style={{ height: '220px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="tier" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#121722',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {riskData.map((entry) => (
                    <Cell key={entry.tier} fill={tierColors[entry.tier] || '#00d2ff'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pattern Breakdown Chart */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
          }}
        >
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>
            Fraud Patterns Detected
          </h2>
          <div style={{ height: '220px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={patternData} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
                <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="pattern" type="category" stroke="#64748b" fontSize={11} tickLine={false} width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#121722',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="count" fill="var(--accent-cyan)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Access Tables: Active Fraud Rings & Recent Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '20px' }}>
        {/* Fraud Rings Table */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff' }}>
              Coordinated Fraud Rings
            </h2>
            <button
              onClick={() => navigate('/rings')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'none',
                color: 'var(--accent-cyan)',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {rings.slice(0, 5).map((ring) => (
              <div
                key={ring._id}
                onClick={() => navigate(`/rings/${ring._id}`)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(0, 210, 255, 0.1)',
                      color: 'var(--accent-cyan)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                    }}
                  >
                    {ring.label.replace('RING-', '#')}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>{ring.label}</span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: ring.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                          color: ring.status === 'ACTIVE' ? '#10b981' : '#94a3b8',
                          fontWeight: 600,
                        }}
                      >
                        {ring.status}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {ring.patterns.join(', ')} · {ring.memberCount || 0} members · ${ring.totalFlow.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <RiskBadge score={ring.score} size="sm" />
                  <ExternalLink size={14} color="var(--text-muted)" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Alerts Table */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff' }}>
              High-Risk Alerts
            </h2>
            <button
              onClick={() => navigate('/alerts')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'none',
                color: 'var(--accent-cyan)',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              <span>Alert Queue</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert._id}
                onClick={() => navigate('/alerts')}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#fff' }}>
                      {alert.pattern.replace(/_/g, ' ')}
                    </span>
                    <SeverityBadge severity={alert.severity} size="sm" />
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Score: {alert.score} · Status: {alert.triageStatus}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TriageStatusBadge status={alert.triageStatus} />
                  <ExternalLink size={14} color="var(--text-muted)" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

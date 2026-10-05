import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  LayoutDashboard,
  AlertTriangle,
  Network,
  GitFork,
  Sliders,
  Database,
  Play,
  LogOut,
  User,
  CheckCircle2,
  Loader2,
  Briefcase,
} from 'lucide-react';
import { useAuth } from '../app/AuthContext';
import { runAnalysis } from '../api/analysisApi';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const [runStatusText, setRunStatusText] = useState<string | null>(null);
  const [lastRunSuccess, setLastRunSuccess] = useState<string | null>(null);

  const handleRunAnalysis = async () => {
    try {
      setIsRunning(true);
      setLastRunSuccess(null);
      setRunStatusText('Building graph & detecting patterns...');

      // Small delay simulation for visual progress state transitions
      const res = await runAnalysis('MANUAL');
      setRunStatusText('Reconciling fraud rings & updating risk...');

      setTimeout(() => {
        setRunStatusText(null);
        setLastRunSuccess(`Analysis completed in ${res.summary.stageMs?.totalDuration || 120}ms! Found ${res.summary.totalAlerts} alerts & ${res.summary.totalRings} rings.`);
        setTimeout(() => setLastRunSuccess(null), 6000);
        // Dispatch custom event to refresh active views
        window.dispatchEvent(new CustomEvent('fraudtrace:analysis-completed'));
      }, 300);
    } catch (err: any) {
      alert(`Analysis run failed: ${err.message || 'Unknown error'}`);
      setRunStatusText(null);
    } finally {
      setIsRunning(false);
    }
  };

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/alerts', label: 'Alerts Queue', icon: AlertTriangle },
    { to: '/cases', label: 'Cases', icon: Briefcase },
    { to: '/rings', label: 'Fraud Rings', icon: Network },
    { to: '/graph', label: 'Graph Explorer', icon: GitFork },
    { to: '/data', label: 'Data Batches', icon: Database },
    { to: '/rules', label: 'Rules & Engine', icon: Sliders },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Top Navigation Bar */}
      <header
        style={{
          height: '64px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'rgba(18, 23, 34, 0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <div
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--accent-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: 'var(--shadow-glow)',
              }}
            >
              <ShieldAlert size={20} />
            </div>
            <div>
              <span style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>
                Fraud<span style={{ color: 'var(--accent-cyan)' }}>Trace</span>
              </span>
              <span
                style={{
                  display: 'block',
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 600,
                }}
              >
                Investigation Platform
              </span>
            </div>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {navLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.88rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#00d2ff' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'rgba(0, 210, 255, 0.1)' : 'transparent',
                  border: isActive ? '1px solid rgba(0, 210, 255, 0.25)' : '1px solid transparent',
                  transition: 'all 0.2s ease',
                })}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {runStatusText && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8rem',
                color: '#00d2ff',
                backgroundColor: 'rgba(0, 210, 255, 0.12)',
                padding: '4px 10px',
                borderRadius: '9999px',
                border: '1px solid rgba(0, 210, 255, 0.3)',
              }}
            >
              <Loader2 size={14} className="spin-animate" />
              {runStatusText}
            </span>
          )}

          {lastRunSuccess && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8rem',
                color: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                padding: '4px 10px',
                borderRadius: '9999px',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              <CheckCircle2 size={14} />
              {lastRunSuccess}
            </span>
          )}

          <button
            onClick={handleRunAnalysis}
            disabled={isRunning}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-gradient)',
              color: '#070a0f',
              fontSize: '0.84rem',
              fontWeight: 700,
              boxShadow: 'var(--shadow-glow)',
              opacity: isRunning ? 0.7 : 1,
            }}
          >
            {isRunning ? <Loader2 size={16} className="spin-animate" /> : <Play size={16} fill="currentColor" />}
            <span>{isRunning ? 'Analyzing Graph...' : 'Run Detection'}</span>
          </button>

          <div
            style={{
              height: '24px',
              width: '1px',
              backgroundColor: 'var(--border-color)',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 10px',
                backgroundColor: 'var(--bg-surface-elevated)',
                borderRadius: '9999px',
                border: '1px solid var(--border-color)',
                fontSize: '0.82rem',
              }}
            >
              <User size={14} color="var(--accent-cyan)" />
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{user?.email || 'analyst'}</span>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  padding: '1px 6px',
                  borderRadius: '4px',
                }}
              >
                {user?.role || 'ANALYST'}
              </span>
            </div>

            <button
              onClick={logout}
              title="Logout"
              style={{
                background: 'none',
                color: 'var(--text-muted)',
                padding: '8px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main style={{ flex: 1, padding: '24px 32px', maxWidth: '1600px', width: '100%', margin: '0 auto' }}>
        <Outlet />
      </main>
    </div>
  );
};

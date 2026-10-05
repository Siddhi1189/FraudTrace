import React, { useEffect, useState } from 'react';
import { fetchActiveRules, DetectorRules } from '../../api/analysisApi';

export const RulesPage: React.FC = () => {
  const [rules, setRules] = useState<DetectorRules | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRules() {
      try {
        setLoading(true);
        const res = await fetchActiveRules();
        setRules(res);
      } catch (err) {
        console.error('Failed to load rules:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRules();
  }, []);

  if (loading) {
    return <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Loading rules configuration...</div>;
  }

  if (!rules) {
    return <div style={{ padding: '40px', color: 'var(--danger)' }}>Failed to load detector rules.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#fff' }}>Detection & Scoring Engine Rules</h1>
          <span
            style={{
              padding: '2px 8px',
              backgroundColor: 'rgba(0, 210, 255, 0.15)',
              color: 'var(--accent-cyan)',
              borderRadius: '4px',
              fontWeight: 700,
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {rules.ruleVersion}
          </span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Deterministic rule thresholds and category contribution caps governing pattern alerts and explainable risk scores.
        </p>
      </div>

      {/* Account Scoring Category Contribution Caps */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
        }}
      >
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>
          Account Risk Scoring Configuration
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          {rules.scoringWeights.account.explanation}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {Object.entries(rules.scoringWeights.account.categoryCaps).map(([key, cap]) => (
            <div
              key={key}
              style={{
                padding: '14px',
                backgroundColor: 'var(--bg-surface-elevated)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
              }}
            >
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {key.replace(/([A-Z])/g, ' $1')}
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '4px' }}>
                {cap} pts
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Maximum category cap</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detector Thresholds Grid */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
        }}
      >
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>
          Pattern Detector Thresholds
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {Object.entries(rules.detectorThresholds)
            .filter(([k]) => typeof rules.detectorThresholds[k] === 'object')
            .map(([detectorName, config]: [string, any]) => (
              <div
                key={detectorName}
                style={{
                  padding: '16px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', textTransform: 'uppercase' }}>
                    {detectorName.replace(/([A-Z])/g, '_$1')}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem' }}>
                  {Object.entries(config).map(([param, val]) => (
                    <div key={param} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{param}:</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                        {String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

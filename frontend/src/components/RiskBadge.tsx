import React from 'react';

interface RiskBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ score, size = 'md', showLabel = true }) => {
  let tier = 'LOW';
  let color = '#10b981'; // Green
  let bg = 'rgba(16, 185, 129, 0.15)';
  let border = 'rgba(16, 185, 129, 0.3)';

  if (score >= 85) {
    tier = 'CRITICAL';
    color = '#ef4444'; // Red
    bg = 'rgba(239, 68, 68, 0.15)';
    border = 'rgba(239, 68, 68, 0.4)';
  } else if (score >= 70) {
    tier = 'HIGH';
    color = '#f97316'; // Orange
    bg = 'rgba(249, 115, 22, 0.15)';
    border = 'rgba(249, 115, 22, 0.4)';
  } else if (score >= 40) {
    tier = 'MEDIUM';
    color = '#f59e0b'; // Amber
    bg = 'rgba(245, 158, 11, 0.15)';
    border = 'rgba(245, 158, 11, 0.4)';
  }

  const fontSizes = {
    sm: '0.75rem',
    md: '0.85rem',
    lg: '1.1rem',
  };

  const paddings = {
    sm: '2px 6px',
    md: '4px 10px',
    lg: '6px 14px',
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: bg,
        color,
        border: `1px solid ${border}`,
        borderRadius: '9999px',
        padding: paddings[size],
        fontSize: fontSizes[size],
        fontWeight: 600,
        fontFamily: 'var(--font-mono)',
        whiteSpace: 'nowrap',
      }}
      title={`Investigative Risk Score: ${score}/100 (${tier})`}
    >
      <span
        style={{
          width: size === 'sm' ? '6px' : '8px',
          height: size === 'sm' ? '6px' : '8px',
          borderRadius: '50%',
          backgroundColor: color,
        }}
      />
      <span>{score}</span>
      {showLabel && <span style={{ opacity: 0.85, fontWeight: 500, fontSize: '0.85em' }}>· {tier}</span>}
    </span>
  );
};

import React from 'react';

interface SeverityBadgeProps {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  size?: 'sm' | 'md';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, size = 'md' }) => {
  const normalized = (severity || 'LOW').toUpperCase();

  const styles: Record<string, { bg: string; color: string; border: string }> = {
    CRITICAL: {
      bg: 'rgba(239, 68, 68, 0.18)',
      color: '#f87171',
      border: 'rgba(239, 68, 68, 0.4)',
    },
    HIGH: {
      bg: 'rgba(249, 115, 22, 0.18)',
      color: '#fb923c',
      border: 'rgba(249, 115, 22, 0.4)',
    },
    MEDIUM: {
      bg: 'rgba(245, 158, 11, 0.18)',
      color: '#fbbf24',
      border: 'rgba(245, 158, 11, 0.4)',
    },
    LOW: {
      bg: 'rgba(59, 130, 246, 0.18)',
      color: '#60a5fa',
      border: 'rgba(59, 130, 246, 0.4)',
    },
  };

  const style = styles[normalized] || styles.LOW;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: size === 'sm' ? '2px 6px' : '3px 8px',
        borderRadius: '4px',
        fontSize: size === 'sm' ? '0.72rem' : '0.8rem',
        fontWeight: 600,
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      {normalized}
    </span>
  );
};

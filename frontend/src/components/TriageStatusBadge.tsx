import React from 'react';

interface TriageStatusBadgeProps {
  status: 'NEW' | 'REVIEWING' | 'DISMISSED' | 'ESCALATED' | string;
}

export const TriageStatusBadge: React.FC<TriageStatusBadgeProps> = ({ status }) => {
  const normalized = (status || 'NEW').toUpperCase();

  const styles: Record<string, { bg: string; color: string; border: string; label: string }> = {
    NEW: {
      bg: 'rgba(59, 130, 246, 0.12)',
      color: '#93c5fd',
      border: 'rgba(59, 130, 246, 0.3)',
      label: 'New',
    },
    REVIEWING: {
      bg: 'rgba(234, 179, 8, 0.15)',
      color: '#fde047',
      border: 'rgba(234, 179, 8, 0.4)',
      label: 'Reviewing',
    },
    ESCALATED: {
      bg: 'rgba(239, 68, 68, 0.15)',
      color: '#fca5a5',
      border: 'rgba(239, 68, 68, 0.4)',
      label: 'Escalated',
    },
    DISMISSED: {
      bg: 'rgba(148, 163, 184, 0.12)',
      color: '#cbd5e1',
      border: 'rgba(148, 163, 184, 0.25)',
      label: 'Dismissed',
    },
  };

  const current = styles[normalized] || styles.NEW;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 9px',
        borderRadius: '12px',
        fontSize: '0.78rem',
        fontWeight: 600,
        backgroundColor: current.bg,
        color: current.color,
        border: `1px solid ${current.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {current.label}
    </span>
  );
};

import React from 'react';
import { CaseDisposition } from '../api/casesApi';

interface Props {
  disposition: CaseDisposition | null | undefined;
}

export const CaseDispositionBadge: React.FC<Props> = ({ disposition }) => {
  if (!disposition) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 8px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.72rem',
          fontWeight: 500,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          color: 'var(--text-muted)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        Pending Disposition
      </span>
    );
  }

  const styles: Record<CaseDisposition, { bg: string; color: string; border: string; label: string }> = {
    CONFIRMED_FRAUD: {
      bg: 'rgba(255, 77, 79, 0.15)',
      color: '#ff7875',
      border: 'rgba(255, 77, 79, 0.4)',
      label: 'Confirmed Fraud',
    },
    FALSE_POSITIVE: {
      bg: 'rgba(0, 230, 118, 0.12)',
      color: '#00e676',
      border: 'rgba(0, 230, 118, 0.35)',
      label: 'False Positive',
    },
    INCONCLUSIVE: {
      bg: 'rgba(255, 171, 0, 0.15)',
      color: '#ffab00',
      border: 'rgba(255, 171, 0, 0.35)',
      label: 'Inconclusive',
    },
  };

  const current = styles[disposition] || {
    bg: 'rgba(255, 255, 255, 0.05)',
    color: 'var(--text-secondary)',
    border: 'var(--border-color)',
    label: disposition,
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: '12px',
        fontSize: '0.74rem',
        fontWeight: 600,
        backgroundColor: current.bg,
        color: current.color,
        border: `1px solid ${current.border}`,
      }}
    >
      {current.label}
    </span>
  );
};

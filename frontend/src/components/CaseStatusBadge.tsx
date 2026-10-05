import React from 'react';
import { CaseStatus } from '../api/casesApi';

interface Props {
  status: CaseStatus;
}

export const CaseStatusBadge: React.FC<Props> = ({ status }) => {
  const styles: Record<CaseStatus, { bg: string; color: string; border: string; label: string; dot: string }> = {
    OPEN: {
      bg: 'rgba(0, 210, 255, 0.12)',
      color: '#00d2ff',
      border: 'rgba(0, 210, 255, 0.3)',
      label: 'Open',
      dot: '#00d2ff',
    },
    INVESTIGATING: {
      bg: 'rgba(255, 171, 0, 0.15)',
      color: '#ffab00',
      border: 'rgba(255, 171, 0, 0.4)',
      label: 'Investigating',
      dot: '#ffab00',
    },
    CLOSED: {
      bg: 'rgba(0, 230, 118, 0.12)',
      color: '#00e676',
      border: 'rgba(0, 230, 118, 0.3)',
      label: 'Closed',
      dot: '#00e676',
    },
  };

  const current = styles[status] || styles.OPEN;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: '12px',
        fontSize: '0.74rem',
        fontWeight: 600,
        backgroundColor: current.bg,
        color: current.color,
        border: `1px solid ${current.border}`,
        letterSpacing: '0.02em',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: current.dot,
        }}
      />
      {current.label}
    </span>
  );
};

import React from 'react';
import { CaseStatus } from '../api/casesApi';
import { Badge, BadgeVariant } from './common/Badge';

interface Props {
  status: CaseStatus;
}

export const CaseStatusBadge: React.FC<Props> = ({ status }) => {
  const variantMap: Record<CaseStatus, { variant: BadgeVariant; label: string }> = {
    OPEN: { variant: 'medium', label: 'Open' },
    INVESTIGATING: { variant: 'high', label: 'Investigating' },
    CLOSED: { variant: 'low', label: 'Closed' },
  };

  const current = variantMap[status] || variantMap.OPEN;

  return <Badge variant={current.variant}>{current.label}</Badge>;
};

import React from 'react';
import { CaseDisposition } from '../api/casesApi';
import { Badge, BadgeVariant } from './common/Badge';

interface Props {
  disposition: CaseDisposition | null | undefined;
}

export const CaseDispositionBadge: React.FC<Props> = ({ disposition }) => {
  if (!disposition) {
    return <Badge variant="neutral">Pending Disposition</Badge>;
  }

  const styles: Record<CaseDisposition, { variant: BadgeVariant; label: string }> = {
    CONFIRMED_FRAUD: { variant: 'high', label: 'Confirmed Fraud' },
    FALSE_POSITIVE: { variant: 'low', label: 'False Positive' },
    INCONCLUSIVE: { variant: 'medium', label: 'Inconclusive' },
  };

  const current = styles[disposition] || { variant: 'neutral', label: disposition };

  return <Badge variant={current.variant}>{current.label}</Badge>;
};

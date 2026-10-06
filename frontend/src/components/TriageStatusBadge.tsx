import React from 'react';
import { Badge, BadgeVariant } from './common/Badge';

interface TriageStatusBadgeProps {
  status: 'NEW' | 'REVIEWING' | 'DISMISSED' | 'ESCALATED' | string;
}

export const TriageStatusBadge: React.FC<TriageStatusBadgeProps> = ({ status }) => {
  const normalized = (status || 'NEW').toUpperCase();

  const styles: Record<string, { variant: BadgeVariant; label: string }> = {
    NEW: { variant: 'medium', label: 'New' },
    REVIEWING: { variant: 'high', label: 'Reviewing' },
    ESCALATED: { variant: 'critical', label: 'Escalated' },
    DISMISSED: { variant: 'neutral', label: 'Dismissed' },
  };

  const current = styles[normalized] || { variant: 'neutral', label: normalized };

  return <Badge variant={current.variant}>{current.label}</Badge>;
};

import React from 'react';
import { Badge, BadgeVariant } from './common/Badge';

interface SeverityBadgeProps {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  size?: 'sm' | 'md';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  const normalized = (severity || 'LOW').toUpperCase();

  const variantMap: Record<string, BadgeVariant> = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
  };

  const variant = variantMap[normalized] || 'neutral';

  return <Badge variant={variant}>{normalized}</Badge>;
};

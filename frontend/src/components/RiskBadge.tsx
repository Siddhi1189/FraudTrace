import React from 'react';
import { Badge, BadgeVariant } from './common/Badge';

interface RiskBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ score, showLabel = true }) => {
  let tier = 'LOW';
  let variant: BadgeVariant = 'low';

  if (score >= 85) {
    tier = 'CRITICAL';
    variant = 'critical';
  } else if (score >= 70) {
    tier = 'HIGH';
    variant = 'high';
  } else if (score >= 40) {
    tier = 'MEDIUM';
    variant = 'medium';
  }

  return (
    <Badge variant={variant} className="tabular-nums">
      <span style={{ fontWeight: 600 }}>{score}</span>
      {showLabel && <span style={{ opacity: 0.85, fontSize: '0.9em' }}>/ 100 {tier}</span>}
    </Badge>
  );
};

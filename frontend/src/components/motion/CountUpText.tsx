import React from 'react';
import { useCountUp } from '../../hooks/useCountUp';

interface CountUpTextProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export const CountUpText: React.FC<CountUpTextProps> = ({
  value,
  duration = 700,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
}) => {
  const animatedValue = useCountUp(value, { duration, decimals });

  const formatted = decimals > 0
    ? animatedValue.toFixed(decimals)
    : Math.round(animatedValue).toLocaleString('en-IN');

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};

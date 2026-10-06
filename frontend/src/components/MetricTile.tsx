import React from 'react';
import { CountUpText } from './motion/CountUpText';
import styles from './MetricTile.module.css';

interface MetricTileProps {
  label: string;
  value: number;
  subtext?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export const MetricTile: React.FC<MetricTileProps> = ({
  label,
  value,
  subtext,
  badge,
  icon,
  onClick,
  className = '',
  prefix = '',
  suffix = '',
}) => {
  return (
    <div
      className={`${styles.tile} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className={styles.topRow}>
        <span className={styles.label}>{label}</span>
        {icon && <div className={styles.iconWrap}>{icon}</div>}
      </div>

      <div className={styles.valueRow}>
        <span className={styles.value}>
          <CountUpText value={value} prefix={prefix} suffix={suffix} />
        </span>
        {badge}
      </div>

      {subtext && <div className={styles.subtext}>{subtext}</div>}
    </div>
  );
};

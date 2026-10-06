import React, { useMemo } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import styles from './Pictograph.module.css';

export interface PictographRow {
  key: string;
  label: string;
  count: number;
  color?: string; // CSS variable or token, e.g. "var(--sev-high)"
  onClick?: () => void;
  href?: string;
}

interface PictographProps {
  rows: PictographRow[];
  unitName?: string; // e.g. "alert" or "alerts"
  className?: string;
  onRowClick?: (row: PictographRow) => void;
}

export const Pictograph: React.FC<PictographProps> = ({
  rows,
  unitName = 'alert',
  className = '',
  onRowClick,
}) => {
  const isReduced = useReducedMotion();

  const maxCount = useMemo(() => {
    return Math.max(...rows.map((r) => r.count), 0);
  }, [rows]);

  // Scale: if max is 30 or less, 1 mark = 1 alert, otherwise 1 mark = ceil(max/30)
  const unitsPerMark = useMemo(() => {
    if (maxCount <= 30) return 1;
    return Math.ceil(maxCount / 30);
  }, [maxCount]);

  // Exact legend grammar
  const singleUnit = unitName.endsWith('s') ? unitName.slice(0, -1) : unitName;
  const pluralUnit = unitName.endsWith('s') ? unitName : `${unitName}s`;
  const legendUnit = unitsPerMark === 1 ? singleUnit : pluralUnit;

  return (
    <div className={`${styles.pictographContainer} ${className}`}>
      <div className={styles.legendRow}>
        <span>Scale</span>
        <span>
          1 mark = {unitsPerMark} {legendUnit}
        </span>
      </div>

      <div className={styles.rowsList}>
        {rows.map((row) => {
          const fullMarks = Math.floor(row.count / unitsPerMark);
          const hasPartial = row.count % unitsPerMark > 0;
          const markColor = row.color || 'var(--primary)';
          const rowUnit = row.count === 1 ? singleUnit : pluralUnit;
          const ariaLabel = `${row.label}: ${row.count} ${rowUnit}`;

          const handleAction = () => {
            if (row.onClick) row.onClick();
            else if (onRowClick) onRowClick(row);
          };

          return (
            <div
              key={row.key}
              className={styles.rowItem}
              onClick={handleAction}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleAction();
                }
              }}
              tabIndex={0}
              role="img"
              aria-label={ariaLabel}
            >
              <span className={styles.labelCol} title={row.label}>
                {row.label}
              </span>

              <div className={styles.marksTrack} aria-hidden="true">
                {row.count === 0 ? (
                  <span className={styles.emptyZero}>0</span>
                ) : (
                  <>
                    {Array.from({ length: fullMarks }).map((_, i) => (
                      <span
                        key={i}
                        className={styles.mark}
                        style={{
                          backgroundColor: markColor,
                          animationDelay: isReduced ? undefined : `${Math.min(i * 18, 500)}ms`,
                        }}
                      />
                    ))}
                    {hasPartial && (
                      <span
                        className={`${styles.mark} ${styles.partialMark}`}
                        style={{
                          backgroundColor: markColor,
                          animationDelay: isReduced ? undefined : `${Math.min(fullMarks * 18, 500)}ms`,
                        }}
                      />
                    )}
                  </>
                )}
              </div>

              <span className={styles.countCol}>{row.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

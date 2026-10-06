import React, { useRef } from 'react';
import { useInView } from '../hooks/useInView';
import { useReducedMotion } from '../hooks/useReducedMotion';
import styles from './SectionLabel.module.css';

interface SectionLabelProps {
  number: string; // e.g. "01"
  label: string;  // e.g. "FEATURED CLUSTERS"
  className?: string;
}

export const SectionLabel: React.FC<SectionLabelProps> = ({
  number,
  label,
  className = '',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, threshold: 0.1 });
  const isReduced = useReducedMotion();

  return (
    <div ref={ref} className={`${styles.sectionHeader} ${className}`}>
      <div
        className={`${styles.hairline} ${
          isInView || isReduced ? styles.hairlineDrawn : ''
        }`}
      />
      <div className={styles.labelRow}>
        <span className={styles.number}>{number}</span>
        <span className={styles.divider} aria-hidden="true">&mdash;</span>
        <span className={styles.title}>{label}</span>
      </div>
    </div>
  );
};

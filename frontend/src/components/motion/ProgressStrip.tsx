import React from 'react';
import styles from './ProgressStrip.module.css';

export interface ProgressStage {
  key: string;
  label: string;
}

const DEFAULT_STAGES: ProgressStage[] = [
  { key: 'VALIDATION', label: 'Validate' },
  { key: 'GRAPH_CONSTRUCTION', label: 'Build Graph' },
  { key: 'FRAUD_DETECTION', label: 'Detect Patterns' },
  { key: 'RING_GROUPING', label: 'Group Rings' },
  { key: 'RISK_SCORING', label: 'Score & Explain' },
];

interface ProgressStripProps {
  currentStage?: string;
  progressPercent?: number;
  label?: string;
  className?: string;
}

export const ProgressStrip: React.FC<ProgressStripProps> = ({
  currentStage = 'GRAPH_CONSTRUCTION',
  progressPercent = 0,
  label = 'Analysis Pipeline Active',
  className = '',
}) => {
  const stageKeys = DEFAULT_STAGES.map((s) => s.key);
  const currentIndex = stageKeys.indexOf(currentStage);

  const normalizedPercent = Math.max(
    5,
    Math.min(100, progressPercent > 0 ? progressPercent : ((currentIndex + 1) / stageKeys.length) * 100)
  );

  return (
    <div className={`${styles.progressContainer} ${className}`} role="status" aria-live="polite">
      <div className={styles.topRow}>
        <div className={styles.label}>
          <span className={styles.pulsingDot} aria-hidden="true" />
          <span>{label}</span>
        </div>
        <span className={styles.percentage}>
          {Math.round(normalizedPercent)}%
        </span>
      </div>

      <div className={styles.track}>
        <div
          className={styles.bar}
          style={{ transform: `scaleX(${normalizedPercent / 100})` }}
        />
      </div>

      <div className={styles.stagesRow}>
        {DEFAULT_STAGES.map((stage, idx) => {
          const isActive = idx === currentIndex;
          const isDone = idx < currentIndex || normalizedPercent === 100;
          return (
            <span
              key={stage.key}
              className={`${styles.stageItem} ${isActive ? styles.stageActive : ''} ${
                isDone ? styles.stageCompleted : ''
              }`}
            >
              {stage.label}
            </span>
          );
        })}
      </div>
    </div>
  );
};

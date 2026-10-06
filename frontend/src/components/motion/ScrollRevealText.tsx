import React, { useRef } from 'react';
import { useScrollProgress } from '../../hooks/useScrollProgress';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import styles from './ScrollRevealText.module.css';

interface ScrollRevealTextProps {
  text: string;
  className?: string;
  as?: React.ElementType;
}

export const ScrollRevealText: React.FC<ScrollRevealTextProps> = ({
  text,
  className = '',
  as: Component = 'p',
}) => {
  const containerRef = useRef<HTMLElement>(null);
  const progress = useScrollProgress(containerRef);
  const isReduced = useReducedMotion();

  const words = text.split(/\s+/).filter(Boolean);
  const total = words.length;

  return (
    <Component ref={containerRef} className={`${styles.container} ${className}`}>
      {words.map((word, idx) => {
        // Words illuminate between progress 0.20 and 0.85
        const startThreshold = 0.2 + (idx / total) * 0.6;
        const isIlluminated = isReduced || progress >= startThreshold;

        return (
          <span
            key={idx}
            className={styles.word}
            style={{
              opacity: isIlluminated ? 1 : 0.28,
              color: isIlluminated ? 'var(--text)' : 'var(--text-3)',
            }}
          >
            {word}
          </span>
        );
      })}
    </Component>
  );
};

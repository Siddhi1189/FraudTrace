import React, { useRef } from 'react';
import { useInView } from '../../hooks/useInView';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import styles from './SplitWords.module.css';

interface SplitWordsProps {
  text: string;
  highlightWords?: string[];
  accentWords?: string[];
  accentClassName?: string;
  delay?: number;
  durationMs?: number;
  staggerMs?: number;
  className?: string;
  as?: React.ElementType;
}

export const SplitWords: React.FC<SplitWordsProps> = ({
  text,
  highlightWords = [],
  accentWords = [],
  accentClassName = '',
  delay = 0,
  durationMs,
  staggerMs = 60,
  className = '',
  as: Component = 'span',
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, threshold: 0.1 });
  const isReduced = useReducedMotion();

  const words = text.split(/\s+/).filter(Boolean);
  const combinedAccents = [...highlightWords, ...accentWords];
  const cleanHighlights = new Set(
    combinedAccents.map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ''))
  );

  return (
    <Component ref={ref} className={`${styles.splitContainer} ${className}`}>
      {words.map((word, index) => {
        const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
        const isAccent = cleanHighlights.has(cleanWord);
        const wordDelay = isReduced ? 0 : delay + index * staggerMs;

        return (
          <span key={index} className={styles.wordMask}>
            <span
              style={{
                ...(isReduced
                  ? {}
                  : {
                      transitionDelay: `${wordDelay}ms`,
                      ...(durationMs ? { transitionDuration: `${durationMs}ms` } : {}),
                    }),
              }}
              className={`${styles.wordInner} ${isAccent ? `${styles.accentWord} ${accentClassName}` : ''} ${
                isInView || isReduced ? styles.visible : ''
              }`}
            >
              {word}
            </span>
          </span>
        );
      })}
    </Component>
  );
};

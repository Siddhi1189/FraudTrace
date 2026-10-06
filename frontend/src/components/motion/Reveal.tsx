import React, { useRef } from 'react';
import { useInView } from '../../hooks/useInView';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import styles from './Reveal.module.css';

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  as?: React.ElementType;
}

export const Reveal: React.FC<RevealProps> = ({
  children,
  delay = 0,
  duration = 600,
  className = '',
  as: Component = 'div',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, threshold: 0.1 });
  const isReduced = useReducedMotion();

  const style = isReduced
    ? undefined
    : {
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      };

  return (
    <Component
      ref={ref}
      style={style}
      className={`${styles.revealWrapper} ${isInView || isReduced ? styles.revealed : ''} ${className}`}
    >
      {children}
    </Component>
  );
};

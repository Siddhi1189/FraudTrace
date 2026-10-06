import { useEffect, useState, useRef } from 'react';
import { isReducedMotion } from '../lib/motion';

interface UseCountUpOptions {
  duration?: number;
  start?: number;
  decimals?: number;
}

/**
 * Counts up a numeric value from start to target value using rAF.
 * Respects prefers-reduced-motion by returning the target value immediately.
 */
export function useCountUp(
  targetValue: number,
  options: UseCountUpOptions = {}
): number {
  const { duration = 700, start = 0, decimals = 0 } = options;
  const [displayValue, setDisplayValue] = useState(targetValue);
  const prevTargetRef = useRef(targetValue);

  useEffect(() => {
    if (isReducedMotion()) {
      setDisplayValue(targetValue);
      prevTargetRef.current = targetValue;
      return;
    }

    const startVal = prevTargetRef.current !== targetValue ? prevTargetRef.current : start;
    const diff = targetValue - startVal;
    if (diff === 0) {
      setDisplayValue(targetValue);
      return;
    }

    let startTime: number | null = null;
    let rafId: number;

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);

      const current = startVal + diff * eased;
      const factor = Math.pow(10, decimals);
      setDisplayValue(Math.round(current * factor) / factor);

      if (progress < 1) {
        rafId = window.requestAnimationFrame(step);
      } else {
        setDisplayValue(targetValue);
        prevTargetRef.current = targetValue;
      }
    };

    rafId = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [targetValue, duration, start, decimals]);

  return displayValue;
}

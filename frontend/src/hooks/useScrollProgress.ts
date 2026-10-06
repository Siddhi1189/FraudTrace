import { useEffect, useState, RefObject } from 'react';
import { clamp } from '../lib/motion';

/**
 * Tracks scroll progress (0..1) of the document or a specific element ref.
 * Uses a single passive scroll listener throttled with requestAnimationFrame.
 */
export function useScrollProgress<T extends HTMLElement = HTMLElement>(
  targetRef?: RefObject<T | null>
): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (targetRef && targetRef.current) {
            const rect = targetRef.current.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            // Progress from when top enters viewport bottom to when bottom leaves viewport top
            const totalDistance = windowHeight + rect.height;
            const currentDistance = windowHeight - rect.top;
            const p = clamp(currentDistance / totalDistance, 0, 1);
            setProgress(p);
          } else {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const p = docHeight > 0 ? clamp(scrollTop / docHeight, 0, 1) : 0;
            setProgress(p);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [targetRef]);

  return progress;
}

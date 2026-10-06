import { useEffect, useState } from 'react';
import { isReducedMotion } from '../lib/motion';

/**
 * Reactive hook that tracks system prefers-reduced-motion and [data-motion="reduced"] DOM override.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => isReducedMotion());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      setReduced(isReducedMotion());
    };

    mediaQuery.addEventListener?.('change', update);

    // Also observe DOM attribute mutation on documentElement
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-motion'],
    });

    return () => {
      mediaQuery.removeEventListener?.('change', update);
      observer.disconnect();
    };
  }, []);

  return reduced;
}

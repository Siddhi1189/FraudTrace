import { useEffect, useState, RefObject } from 'react';

/**
 * Returns whether an animation loop should pause based on tab visibility
 * and optional element intersection with viewport.
 */
export function useVisibilityPause<T extends HTMLElement = HTMLElement>(
  elementRef?: RefObject<T | null>
): boolean {
  const [isDocumentVisible, setIsDocumentVisible] = useState(
    typeof document !== 'undefined' ? !document.hidden : true
  );
  const [isElementInView, setIsElementInView] = useState(true);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      setIsDocumentVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!elementRef || !elementRef.current || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsElementInView(entry.isIntersecting);
    });

    observer.observe(elementRef.current);

    return () => {
      observer.disconnect();
    };
  }, [elementRef]);

  // Paused if tab is hidden OR (elementRef provided and element is offscreen)
  const isPaused = !isDocumentVisible || (elementRef ? !isElementInView : false);
  return isPaused;
}

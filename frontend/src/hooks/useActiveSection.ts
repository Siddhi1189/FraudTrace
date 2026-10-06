import { useEffect, useState } from 'react';

/**
 * Scroll-spy hook that observes section elements by ID and returns the current active ID.
 */
export function useActiveSection(sectionIds: string[], offset = 140): string {
  const [activeId, setActiveId] = useState<string>(sectionIds[0] || '');

  useEffect(() => {
    if (typeof window === 'undefined' || sectionIds.length === 0) return;

    let ticking = false;

    const checkActiveSection = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          let current = sectionIds[0];

          for (const id of sectionIds) {
            const el = document.getElementById(id);
            if (!el) continue;
            const top = el.offsetTop - offset;
            const height = el.offsetHeight;
            if (scrollY >= top && scrollY < top + height) {
              current = id;
              break;
            } else if (scrollY >= top) {
              current = id;
            }
          }

          setActiveId(current);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', checkActiveSection, { passive: true });
    checkActiveSection();

    return () => {
      window.removeEventListener('scroll', checkActiveSection);
    };
  }, [sectionIds, offset]);

  return activeId;
}

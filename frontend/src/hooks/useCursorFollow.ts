import { useEffect, useRef, useState, RefObject } from 'react';
import { lerp, isCoarsePointer, isReducedMotion } from '../lib/motion';

export interface UseCursorFollowOptions {
  lerp?: number;
  lerpFactor?: number;
  offset?: { x: number; y: number };
}

/**
 * Tracks mouse position and calculates a lerp-smoothed follower position.
 * Directly applies transform if ref to target element is passed, and returns { x, y, isVisible }.
 * Disabled on touch/coarse pointers and under reduced motion.
 */
export function useCursorFollow(
  elementRef?: RefObject<HTMLElement | null>,
  options: UseCursorFollowOptions = {}
) {
  const lerpVal = options.lerp ?? options.lerpFactor ?? 0.14;
  const offset = options.offset || { x: 20, y: 20 };

  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isInside, setIsInside] = useState(false);

  const targetCoord = useRef({ x: 0, y: 0 });
  const currentCoord = useRef({ x: 0, y: 0 });
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isCoarsePointer() || isReducedMotion()) return;

    const handleMouseMove = (e: MouseEvent) => {
      targetCoord.current = {
        x: e.clientX + offset.x,
        y: e.clientY + offset.y,
      };
      setIsInside(true);
    };

    const handleMouseLeave = () => {
      setIsInside(false);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    const loop = () => {
      currentCoord.current.x = lerp(currentCoord.current.x, targetCoord.current.x, lerpVal);
      currentCoord.current.y = lerp(currentCoord.current.y, targetCoord.current.y, lerpVal);

      if (elementRef?.current) {
        elementRef.current.style.transform = `translate3d(${currentCoord.current.x}px, ${currentCoord.current.y}px, 0)`;
      }

      setPos({
        x: Math.round(currentCoord.current.x),
        y: Math.round(currentCoord.current.y),
      });

      rafId.current = window.requestAnimationFrame(loop);
    };

    rafId.current = window.requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (rafId.current) {
        window.cancelAnimationFrame(rafId.current);
      }
    };
  }, [elementRef, lerpVal, offset.x, offset.y]);

  return { x: pos.x, y: pos.y, isVisible: isInside && !isCoarsePointer() && !isReducedMotion() };
}

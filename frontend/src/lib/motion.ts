/**
 * FraudTrace Motion System
 * Pure mathematical utilities, timing constants, and animation helpers.
 * Strictly adheres to 60fps budget, transform/opacity animation, and reduced-motion overrides.
 */

export const MOTION = {
  duration: {
    fast: 150,
    base: 250,
    slow: 450,
    reveal: 700,
    hero: 900,
  },
  easing: {
    out: 'cubic-bezier(0.22, 1, 0.36, 1)',
    inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  },
  stagger: {
    base: 60,
    item: 80,
  },
} as const;

/**
 * Linear interpolation helper for smooth cursor follow and spring approximations.
 */
export function lerp(start: number, end: number, factor = 0.14): number {
  return start + (end - start) * factor;
}

/**
 * Clamp a number between min and max bounds.
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

/**
 * Checks whether user prefers reduced motion (OS query or data-motion attribute).
 */
export function isReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  const osPreference = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const attrOverride = document.documentElement.getAttribute('data-motion') === 'reduced';
  return osPreference || attrOverride;
}

/**
 * Check whether primary input pointer is coarse (mobile / touch screen).
 */
export function isCoarsePointer(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

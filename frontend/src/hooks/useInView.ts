import { useEffect, useState, useRef, RefObject } from 'react';
import { isReducedMotion } from '../lib/motion';

export interface UseInViewOptions {
  once?: boolean;
  threshold?: number;
  rootMargin?: string;
}

export function useInView<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null> | RefObject<T>,
  options?: UseInViewOptions
): boolean;
export function useInView<T extends HTMLElement = HTMLElement>(
  options?: UseInViewOptions
): [RefObject<T>, boolean];
export function useInView<T extends HTMLElement = HTMLElement>(
  refOrOptions?: RefObject<T | null> | RefObject<T> | UseInViewOptions,
  maybeOptions: UseInViewOptions = {}
): boolean | [RefObject<T>, boolean] {
  const isRef = refOrOptions && 'current' in refOrOptions;
  const internalRef = useRef<T | null>(null);
  const targetRef = isRef ? (refOrOptions as RefObject<T | null>) : internalRef;
  const options = (isRef ? maybeOptions : (refOrOptions as UseInViewOptions)) || {};

  const { once = true, threshold = 0.15, rootMargin = '0px' } = options;
  const [isInView, setIsInView] = useState(() => isReducedMotion());

  useEffect(() => {
    if (isReducedMotion()) {
      setIsInView(true);
      return;
    }

    const node = targetRef.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (once) {
            observer.unobserve(node);
          }
        } else if (!once) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [targetRef, once, threshold, rootMargin]);

  if (isRef) {
    return isInView;
  }
  return [targetRef as unknown as RefObject<T>, isInView];
}

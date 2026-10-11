import { useEffect, useRef, useState } from 'react';

/**
 * True when the user asks the OS/browser for reduced motion.
 * Every animation in the demo is either disabled or short-circuited by this.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

export interface CountUpOptions {
  /** Animation length in ms. */
  duration?: number;
  /** Count up from zero when the component first mounts. */
  animateOnMount?: boolean;
}

/**
 * Animates a number towards `target` with an ease-out curve, in integer steps
 * (money is stored in minor units, so intermediate values stay exact).
 *
 * `counting` lets the caller light up an ornament (e.g. `.cx-counting`) for as
 * long as the number is still moving. Both values settle instantly when reduced
 * motion is requested.
 */
export function useCountUpState(
  target: number,
  options: CountUpOptions = {},
): { value: number; counting: boolean } {
  const { duration = 720, animateOnMount = true } = options;
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(() => (animateOnMount ? 0 : target));
  const [counting, setCounting] = useState(false);
  const displayRef = useRef(display);

  useEffect(() => {
    const settle = () => {
      displayRef.current = target;
      setDisplay(target);
      setCounting(false);
    };

    // Reduced motion, or a tab that cannot paint: show the real number at once.
    if (reduced || (typeof document !== 'undefined' && document.hidden)) {
      settle();
      return;
    }

    const from = displayRef.current;
    if (from === target) {
      setCounting(false);
      return;
    }

    let frame: number | null = null;
    const start = performance.now();
    setCounting(true);
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(from + (target - from) * eased);
      displayRef.current = next;
      setDisplay(next);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        displayRef.current = target;
        frame = null;
        setCounting(false);
      }
    };

    frame = requestAnimationFrame(tick);

    // Safety net: a throttled requestAnimationFrame must never leave a wrong
    // amount on screen — money is always allowed to snap to its real value.
    const guard = window.setTimeout(settle, duration + 140);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.clearTimeout(guard);
    };
  }, [target, duration, reduced]);

  return { value: reduced ? target : display, counting: reduced ? false : counting };
}

/** Convenience wrapper when only the animated number is needed. */
export function useCountUp(target: number, options: CountUpOptions = {}): number {
  return useCountUpState(target, options).value;
}

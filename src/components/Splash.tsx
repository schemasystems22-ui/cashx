import { useCallback, useEffect, useRef, useState } from 'react';
import { CashXWordmark } from './CashXLogo';
import { usePrefersReducedMotion } from './motion';
import { useApp } from '../state/store';

/*
 * The launch screen.
 *
 * Timings are here rather than in CSS so that the component owns one truth: the
 * hold, the progress bar and the exit fade all share the same numbers, and the
 * reduced-motion path is a single pair of constants instead of a second set of
 * keyframes.
 */
const HOLD_MS = 2200;
const EXIT_MS = 520;
const REDUCED_HOLD_MS = 320;
const REDUCED_EXIT_MS = 120;

const SEEN_KEY = 'cashx.splash.seen';

/*
 * Plays once per browser session, then never again — a splash on every
 * navigation would be a tax, not a flourish. The read and the write are separate
 * and both pure, because StrictMode deliberately invokes a state initialiser
 * twice in development and a read-and-set in one would return a different answer
 * the second time.
 */
export function hasSeenSplash(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    /* private mode: session storage is unavailable, so treat it as unseen */
    return false;
  }
}

/** Called once the intro has actually been shown. */
export function markSplashSeen(): void {
  try {
    window.sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* nothing to do — the splash simply plays again on the next load */
  }
}

/**
 * The Yango-Play-style intro: the lockup scales up out of a violet glow, a light
 * band sweeps across it, the tagline rises and a thin rail fills while the app
 * mounts behind it. It then dissolves upward into the app.
 *
 * Skippable by any interaction, and it announces itself once through `role="status"`
 * (the app behind it is `inert` for the duration, so nothing else is reachable).
 */
export function Splash({ onDone }: { onDone: () => void }) {
  const { t } = useApp();
  const reduced = usePrefersReducedMotion();
  const [leaving, setLeaving] = useState(false);
  const finished = useRef(false);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  }, [onDone]);

  /** Any interaction cuts the intro short and goes straight to the dissolve. */
  useEffect(() => {
    const skip = () => setLeaving(true);
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    events.forEach((type) => window.addEventListener(type, skip, { passive: true }));
    return () => events.forEach((type) => window.removeEventListener(type, skip));
  }, []);

  useEffect(() => {
    const hold = window.setTimeout(() => setLeaving(true), reduced ? REDUCED_HOLD_MS : HOLD_MS);
    return () => window.clearTimeout(hold);
  }, [reduced]);

  useEffect(() => {
    if (!leaving) return;
    // Driven by a timer rather than `animationend`, so the overlay is guaranteed
    // to come down even if the animation never runs (reduced motion, hidden tab).
    const exit = window.setTimeout(finish, reduced ? REDUCED_EXIT_MS : EXIT_MS);
    return () => window.clearTimeout(exit);
  }, [leaving, reduced, finish]);

  return (
    <div
      className={['cx-splash', leaving ? 'cx-splash--leaving' : ''].filter(Boolean).join(' ')}
      role="status"
      aria-label={t('splash.loading')}
    >
      <div className="cx-splash__scene" aria-hidden="true">
        <span className="cx-splash__aura" />
        <span className="cx-splash__beam" />
        <span className="cx-splash__glow" />
        <span className="cx-splash__lockup">
          <CashXWordmark size={46} />
          <span className="cx-splash__sweep" />
        </span>
        <span className="cx-splash__tagline">{t('app.tagline')}</span>
      </div>

      <div className="cx-splash__foot" aria-hidden="true">
        <span
          className="cx-splash__bar"
          style={{ ['--cx-splash-hold' as string]: `${HOLD_MS + 200}ms` }}
        >
          <span className="cx-splash__barFill" />
        </span>
        <span className="cx-splash__note">{t('common.demo')} · CashX</span>
      </div>
    </div>
  );
}

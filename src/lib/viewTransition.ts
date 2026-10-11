import { flushSync } from 'react-dom';

/*
 * Real cross-fades between screens.
 *
 * A CSS animation can only fade the *incoming* screen in, because the outgoing
 * one is unmounted the moment React commits the new route — so the old content
 * pops out while the new content fades in. The View Transitions API solves it
 * properly: the browser snapshots the outgoing and incoming DOM and cross-fades
 * the two images, so both are on screen for the whole change.
 *
 * The app frame is named as the transition target (see `.cx-frame` in base.css),
 * so only the phone frame animates and the page behind it stays put. Where the
 * API is unavailable, or the user asked for reduced motion, the update simply
 * runs and the plain CSS enter animation on the screen wrapper takes over.
 */

export type TransitionKind = 'tab' | 'push' | 'step';

/** Attribute read by the stylesheet to pick the right keyframes. */
const KIND_ATTRIBUTE = 'cxVt';

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Runs `update` inside a view transition, flushing the React commit
 * synchronously so the browser sees the finished DOM before it takes the
 * "after" snapshot.
 */
export function runViewTransition(kind: TransitionKind, update: () => void): void {
  // `startViewTransition` is typed as always present, but older engines and
  // non-Chromium browsers are exactly the case this guard exists for.
  if (
    typeof document.startViewTransition !== 'function' ||
    prefersReducedMotion()
  ) {
    update();
    return;
  }

  const root = document.documentElement;
  root.dataset[KIND_ATTRIBUTE] = kind;

  const transition = document.startViewTransition(() => {
    flushSync(update);
  });

  void transition.finished.finally(() => {
    if (root.dataset[KIND_ATTRIBUTE] === kind) delete root.dataset[KIND_ATTRIBUTE];
  });
}

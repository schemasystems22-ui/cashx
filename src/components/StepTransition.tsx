import { useEffect, useRef, type ReactNode } from 'react';
import { usePrefersReducedMotion } from './motion';

/**
 * Wraps a flow step so its content fades/rises in, the scroll container returns
 * to the top, and focus follows the step change. Pass the same value as React's
 * `key` to force the remount that replays the animation:
 *
 *   <StepTransition key={stage} stageKey={stage} label={stepLabel}>…</StepTransition>
 *
 * Why focus: moving from step 1 to step 2 unmounts the button that was pressed,
 * which would drop focus onto `<body>` and send a screen-reader user back to the
 * top of the document. Focusing the step container instead announces the new
 * step through `label` ("Step 2 of 3: …"), so the change is both perceivable and
 * narrated. The container is a scripted focus target only — it carries
 * `tabIndex={-1}` and is never part of the Tab order.
 *
 * The first render of a screen is skipped: navigating to a screen focuses the
 * screen itself (see App.tsx), and two focus moves would fight.
 */
export function StepTransition({
  stageKey,
  label,
  className,
  children,
}: {
  stageKey: string;
  /** Accessible name for the step, e.g. "Step 2 of 3: Transaction summary". */
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    const node = ref.current;
    const scroller = node?.closest('.cx-body');
    if (scroller instanceof HTMLElement) {
      scroller.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    }
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    node?.focus({ preventScroll: true });
  }, [stageKey, reduced]);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="group"
      aria-label={label}
      className={['cx-body__inner', 'cx-enter', className].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}

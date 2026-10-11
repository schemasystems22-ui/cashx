import { useCallback, useEffect, useRef, type KeyboardEvent, type RefObject } from 'react';

/*
 * Keyboard and focus plumbing shared by the interactive controls.
 *
 * These are deliberately dependency-free and framework-agnostic in spirit: they
 * only touch the DOM in ways the WAI-ARIA authoring practices prescribe, so the
 * same helpers serve the wallet tiles, the destination segmented control, the
 * star rating and the modal sheets.
 */

/**
 * Which option an arrow key moves to, or null when the key is not a navigation
 * key. Exported for testing: in RTL the left/right pair swaps, which is the part
 * easiest to get subtly wrong.
 */
export function nextRadioIndex(
  key: string,
  current: number,
  count: number,
  dir: 'rtl' | 'ltr',
): number | null {
  const forward = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
  const backward = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';

  if (key === 'ArrowDown' || key === forward) return (current + 1) % count;
  if (key === 'ArrowUp' || key === backward) return (current - 1 + count) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}

export interface RovingRadioGroup {
  /** Attach to each option, in DOM order. */
  register: (index: number) => (node: HTMLElement | null) => void;
  /** Spread onto the group container (or onto every option). */
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  /** Tab stop for an option: only the selected one is reachable by Tab. */
  tabIndexFor: (index: number) => 0 | -1;
}

/**
 * Implements the WAI-ARIA radiogroup keyboard contract for a group of
 * `role="radio"` elements:
 *
 *   - one Tab stop for the whole group (roving tabindex)
 *   - arrows move *and* select, wrapping at both ends
 *   - Home / End jump to the first / last option
 *
 * `direction` only affects the left/right pair, so an RTL layout advances to the
 * left exactly as the user expects.
 */
export function useRovingRadioGroup({
  count,
  selectedIndex,
  onSelectIndex,
  direction = 'ltr',
}: {
  count: number;
  /** Index of the checked option, or -1 when nothing is selected yet. */
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  direction?: 'rtl' | 'ltr';
}): RovingRadioGroup {
  const refs = useRef<(HTMLElement | null)[]>([]);
  // With nothing selected the first option carries the Tab stop, otherwise the
  // group would be skipped entirely by keyboard users.
  const tabStop = selectedIndex >= 0 ? selectedIndex : 0;

  const register = useCallback(
    (index: number) => (node: HTMLElement | null) => {
      refs.current[index] = node;
    },
    [],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (count === 0) return;
      const next = nextRadioIndex(event.key, tabStop, count, direction);
      if (next === null) return;
      event.preventDefault();
      onSelectIndex(next);
      refs.current[next]?.focus();
    },
    [count, direction, onSelectIndex, tabStop],
  );

  return { register, onKeyDown, tabIndexFor: (index) => (index === tabStop ? 0 : -1) };
}

/**
 * Moves focus to the first element in `ids` that exists and can take focus.
 * Used after a failed validation so the user lands on the field that needs
 * fixing instead of being left stranded on the button they pressed.
 *
 * Returns true when something was focused.
 */
export function focusFirstAvailable(ids: readonly string[]): boolean {
  for (const id of ids) {
    const node = document.getElementById(id);
    if (!node) continue;
    if (node.hasAttribute('disabled')) continue;
    node.focus();
    if (document.activeElement === node) return true;
  }
  return false;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Dialog behaviour for the bottom sheets: remembers what had focus, moves focus
 * inside, cycles Tab within the panel, closes on Escape and hands focus back
 * when the sheet goes away.
 *
 * The previous focus target is only restored if it is still in the document —
 * a sheet opened from a screen that has since unmounted must not try to refocus
 * a detached node.
 */
export function useDialogFocus(
  panelRef: RefObject<HTMLElement | null>,
  onClose: () => void,
): void {
  /*
   * The close callback is usually an inline arrow function, so its identity
   * changes on every render of the sheet. Keeping it in a ref (and depending only
   * on the stable panel) is what stops the setup effect from re-running and
   * yanking focus back to the first control whenever the sheet re-renders — for
   * example when the language is switched from inside the sheet.
   */
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const panel = panelRef.current;
    const previous = document.activeElement as HTMLElement | null;

    const focusable = (): HTMLElement[] => {
      if (!panel) return [];
      return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (node) => node.offsetParent !== null || node === document.activeElement,
      );
    };

    const initial = focusable()[0] ?? panel;
    initial?.focus({ preventScroll: true });

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (active === first || !panel?.contains(active))) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      if (previous && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, [panelRef]);
}

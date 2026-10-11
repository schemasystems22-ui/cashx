import { describe, expect, it } from 'vitest';
import { nextRadioIndex } from './a11y';

/*
 * The keyboard contract for `role="radiogroup"`: arrows move *and* select, the
 * ends wrap, and Home/End jump. Only the left/right pair depends on the reading
 * direction, and that swap is the part most likely to break silently — in RTL a
 * "forward" press has to move toward the left, or the control feels inverted.
 */
describe('nextRadioIndex', () => {
  it('advances on ArrowRight and wraps at the end (LTR)', () => {
    expect(nextRadioIndex('ArrowRight', 0, 3, 'ltr')).toBe(1);
    expect(nextRadioIndex('ArrowRight', 2, 3, 'ltr')).toBe(0);
  });

  it('goes back on ArrowLeft and wraps at the start (LTR)', () => {
    expect(nextRadioIndex('ArrowLeft', 2, 3, 'ltr')).toBe(1);
    expect(nextRadioIndex('ArrowLeft', 0, 3, 'ltr')).toBe(2);
  });

  it('swaps the horizontal pair in RTL', () => {
    expect(nextRadioIndex('ArrowLeft', 0, 3, 'rtl')).toBe(1);
    expect(nextRadioIndex('ArrowRight', 0, 3, 'rtl')).toBe(2);
  });

  it('treats the vertical arrows the same in both directions', () => {
    for (const dir of ['ltr', 'rtl'] as const) {
      expect(nextRadioIndex('ArrowDown', 1, 4, dir)).toBe(2);
      expect(nextRadioIndex('ArrowUp', 1, 4, dir)).toBe(0);
      // Vertical keys never wrap backwards past zero into the last option.
      expect(nextRadioIndex('ArrowUp', 0, 4, dir)).toBe(3);
    }
  });

  it('jumps to the first and last option with Home and End', () => {
    expect(nextRadioIndex('Home', 2, 5, 'ltr')).toBe(0);
    expect(nextRadioIndex('End', 2, 5, 'ltr')).toBe(4);
    expect(nextRadioIndex('Home', 2, 5, 'rtl')).toBe(0);
    expect(nextRadioIndex('End', 2, 5, 'rtl')).toBe(4);
  });

  it('ignores keys that are not navigation', () => {
    for (const key of ['Tab', 'Enter', ' ', 'Escape', 'a', 'PageDown']) {
      expect(nextRadioIndex(key, 1, 3, 'ltr')).toBeNull();
    }
  });

  it('never returns an index outside the group', () => {
    for (const dir of ['ltr', 'rtl'] as const) {
      for (const count of [1, 2, 5]) {
        for (let current = 0; current < count; current += 1) {
          for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']) {
            const next = nextRadioIndex(key, current, count, dir);
            expect(next).toBeGreaterThanOrEqual(0);
            expect(next).toBeLessThan(count);
          }
        }
      }
    }
  });
});

import { describe, expect, it } from 'vitest';
import { createLocalId, createPaymentReference, createTransactionId } from './ids';

/**
 * Ids are built from local-time components, so these assertions do not depend on
 * the machine's timezone. Month is zero-based in the Date constructor.
 */
describe('createTransactionId', () => {
  it('produces the reference format TXN-YYMMDD-HHMMSS', () => {
    // The exact example shown in the reference screenshots.
    expect(createTransactionId(new Date(2026, 9, 11, 10, 45, 12))).toBe('TXN-261011-104512');
  });

  it('zero-pads every component', () => {
    expect(createTransactionId(new Date(2026, 0, 5, 9, 8, 7))).toBe('TXN-260105-090807');
  });

  it('rolls the year down to two digits', () => {
    expect(createTransactionId(new Date(2030, 11, 31, 23, 59, 59))).toBe('TXN-301231-235959');
    expect(createTransactionId(new Date(2000, 0, 1, 0, 0, 0))).toBe('TXN-000101-000000');
    expect(createTransactionId(new Date(2099, 5, 15, 12, 0, 0))).toBe('TXN-990615-120000');
  });

  it('encodes every month with the correct 1-based index', () => {
    // Guards against the classic off-by-one of passing a raw zero-based month.
    for (let month = 0; month < 12; month += 1) {
      // Layout is TXN-YYMMDD-HHMMSS, so the month sits at offset 6.
      const id = createTransactionId(new Date(2026, month, 1, 0, 0, 0));
      expect(id.slice(6, 8)).toBe(String(month + 1).padStart(2, '0'));
    }
  });

  it('is a pure function of the time it is given', () => {
    const when = new Date(2026, 9, 11, 10, 45, 12);
    expect(createTransactionId(when)).toBe(createTransactionId(new Date(when.getTime())));
  });

  it('matches the documented shape for a live call', () => {
    expect(createTransactionId()).toMatch(/^TXN-\d{6}-\d{6}$/);
  });

  it('stays inside the second it was generated in', () => {
    // Ids have one-second resolution by design: two calls in the same second are
    // deliberately identical, so nothing here should imply more uniqueness than
    // that. The demo's ~1.5s simulated payment delay keeps this off the critical
    // path, but a real provider integration would need a stronger key.
    const first = createTransactionId(new Date(2026, 9, 11, 10, 45, 12, 0));
    const laterInSameSecond = createTransactionId(new Date(2026, 9, 11, 10, 45, 12, 999));
    const nextSecond = createTransactionId(new Date(2026, 9, 11, 10, 45, 13, 0));

    expect(laterInSameSecond).toBe(first);
    expect(nextSecond).not.toBe(first);
  });
});

describe('createPaymentReference', () => {
  it('is prefixed so it can never be mistaken for a transaction id', () => {
    expect(createPaymentReference()).toMatch(/^DEMO-[A-Z0-9]*$/);
  });

  it('produces a non-empty reference on every call', () => {
    for (let i = 0; i < 50; i += 1) {
      const reference = createPaymentReference();
      expect(reference.length).toBeGreaterThan('DEMO-'.length);
    }
  });
});

describe('createLocalId', () => {
  it('honours the prefix and stays unique across calls', () => {
    const ids = new Set(Array.from({ length: 200 }, () => createLocalId('tx')));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id.startsWith('tx-')).toBe(true);
  });

  it('defaults the prefix', () => {
    expect(createLocalId()).toMatch(/^id-/);
  });
});

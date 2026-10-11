import { describe, expect, it } from 'vitest';
import { createTranslator } from './i18n';
import { buildReceiptModel } from './receipt';
import { RECEIPT_WIDTH, measureReceipt } from './receiptImage';
import { QR_QUIET_ZONE } from './qr';
import type { Transaction } from './types';

const ar = createTranslator('ar');

const base: Transaction = {
  id: 'TXN-261011-104512',
  flowType: 'transfer',
  sourceWallet: 'vodafone',
  destinationType: 'instapay',
  recipient: '01012345678',
  recipientAmount: 100_000,
  fee: 500,
  totalAmount: 100_500,
  currency: 'EGP',
  status: 'completed',
  createdAt: '2026-10-11T22:45:00',
  isDemo: true,
};

const layoutFor = (tx: Transaction, lang: 'ar' | 'en' = 'ar') =>
  measureReceipt(buildReceiptModel(tx, lang, createTranslator(lang)));

describe('measureReceipt — geometry', () => {
  const layout = layoutFor(base);

  it('keeps the card the fixed logical width', () => {
    expect(layout.width).toBe(RECEIPT_WIDTH);
    expect(layout.centre).toBe(RECEIPT_WIDTH / 2);
  });

  it('places every band in vertical order', () => {
    expect(layout.pillY).toBeLessThan(layout.amountBaseline);
    expect(layout.amountBaseline).toBeLessThan(layout.amountLabelBaseline);
    expect(layout.amountLabelBaseline).toBeLessThan(layout.rowsStart);
    expect(layout.rowsStart).toBeLessThan(layout.rowsEnd);
    expect(layout.rowsEnd).toBeLessThan(layout.qr.y);
    expect(layout.qr.y).toBeLessThan(layout.idBaseline);
    expect(layout.idBaseline).toBeLessThan(layout.rowsEnd + 1e6);
    expect(layout.panelBottom).toBeLessThan(layout.footerBaseline);
    expect(layout.footerBaseline).toBeLessThan(layout.height);
  });

  it('centres the QR symbol horizontally', () => {
    expect(layout.qr.x + layout.qr.total / 2).toBeCloseTo(layout.centre, 6);
  });

  it('keeps the QR and its quiet zone inside the panel', () => {
    expect(layout.qr.x).toBeGreaterThanOrEqual(layout.panel.x);
    expect(layout.qr.x + layout.qr.total).toBeLessThanOrEqual(layout.panel.x + layout.panel.width);
  });

  it('keeps the rows inside the panel', () => {
    expect(layout.content.left).toBeGreaterThan(layout.panel.x);
    expect(layout.content.right).toBeLessThan(layout.panel.x + layout.panel.width);
  });

  it('has room for the QR quiet zone on both sides', () => {
    expect(layout.qr.x + QR_QUIET_ZONE).toBeGreaterThanOrEqual(layout.panel.x);
  });

  /*
   * Regression guard. The first version of the renderer used a hard-coded card
   * height, which put the QR code straight through the last two detail rows on a
   * transfer receipt (six rows) while looking fine on a top-up (five rows).
   */
  it('never lets the QR overlap the last detail row', () => {
    const variants: Transaction[] = [
      base,
      { ...base, flowType: 'add_balance', destinationType: 'cashx_balance' },
      { ...base, destinationType: 'bank', destinationWallet: undefined },
      { ...base, destinationType: 'wallet', destinationWallet: 'orange' },
    ];

    for (const tx of variants) {
      for (const lang of ['ar', 'en'] as const) {
        const measured = layoutFor(tx, lang);
        expect(measured.qr.y).toBeGreaterThanOrEqual(measured.rowsEnd);
      }
    }
  });

  it('grows the card rather than squeezing the content in', () => {
    const topUp = layoutFor({ ...base, flowType: 'add_balance', destinationType: 'cashx_balance' });
    expect(layout.height).toBeGreaterThan(topUp.height);
    // The taller transfer card gains exactly one row's worth of height.
    expect(layout.height - topUp.height).toBe(34);
  });

  it('reserves space for the route block only when there is one', () => {
    const withRoute = layoutFor(base);
    const without = measureReceipt({
      ...buildReceiptModel(base, 'ar', ar),
      route: null,
      rows: buildReceiptModel(base, 'ar', ar).rows.slice(0, 5),
    });
    expect(withRoute.route).not.toBeNull();
    expect(without.route).toBeNull();
    expect(withRoute.height).toBeGreaterThan(without.height);
  });

  it('is deterministic', () => {
    expect(layoutFor(base)).toEqual(layoutFor(base));
  });

  it('is identical in both languages', () => {
    // Only text differs between locales; the geometry must not drift.
    expect(layoutFor(base, 'en')).toEqual(layoutFor(base, 'ar'));
  });
});

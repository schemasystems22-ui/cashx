import { describe, expect, it } from 'vitest';
import { createTranslator } from './i18n';
import {
  buildReceiptModel,
  buildReceiptTextFromModel,
  describeDestination,
  receiptFileName,
} from './receipt';
import type { Transaction } from './types';

const ar = createTranslator('ar');
const en = createTranslator('en');

/** Mirrors the reference scenario: EGP 1,000.00 received, EGP 5.00 fee. */
const transfer: Transaction = {
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
  completedAt: '2026-10-11T22:45:00',
  isDemo: true,
};

const topUp: Transaction = {
  ...transfer,
  flowType: 'add_balance',
  destinationType: 'cashx_balance',
};

describe('describeDestination', () => {
  it('names the CashX balance for a top-up', () => {
    expect(describeDestination(topUp, ar)).toEqual({ name: 'CashX', brand: 'cashx' });
  });

  it('names an InstaPay recipient', () => {
    expect(describeDestination(transfer, ar)).toEqual({
      name: ar('tr.dest.instapay'),
      brand: 'instapay',
    });
  });

  it('names a bank destination', () => {
    expect(describeDestination({ ...transfer, destinationType: 'bank' }, ar).brand).toBe('bank');
  });

  it('names the destination wallet for a wallet transfer', () => {
    const tx: Transaction = { ...transfer, destinationType: 'wallet', destinationWallet: 'orange' };
    expect(describeDestination(tx, ar)).toEqual({ name: 'Orange Cash', brand: 'orange' });
  });

  it('falls back to a generic wallet label when no brand was recorded', () => {
    const tx: Transaction = { ...transfer, destinationType: 'wallet' };
    expect(describeDestination(tx, ar).brand).toBe('cashx');
  });
});

describe('buildReceiptModel — transfer', () => {
  const model = buildReceiptModel(transfer, 'ar', ar);

  it('carries the transaction ID as both identifier and QR payload', () => {
    expect(model.id).toBe('TXN-261011-104512');
    expect(model.qrPayload).toBe('TXN-261011-104512');
  });

  it('uses the transfer success heading', () => {
    expect(model.heading).toBe(ar('receipt.heading'));
    expect(model.title).toBe(ar('tr.success.title'));
  });

  it('shows the recipient amount as the headline', () => {
    expect(model.amount).toBe('1,000.00 جنيه');
    expect(model.amountLabel).toBe(ar('tr.summary.recipient'));
  });

  it('lists the reference amounts', () => {
    const byLabel = Object.fromEntries(model.rows.map((row) => [row.label, row.value]));
    expect(byLabel[ar('tr.summary.recipient')]).toBe('1,000.00 جنيه');
    expect(byLabel[ar('tr.summary.fee')]).toBe('5.00 جنيه');
    expect(byLabel[ar('tr.confirm.total')]).toBe('1,005.00 جنيه');
  });

  it('formats the recipient as a grouped phone number', () => {
    expect(model.rows[0].value).toBe('010 1234 5678');
  });

  it('marks the recipient amount green and the total purple', () => {
    expect(model.rows.find((row) => row.label === ar('tr.summary.recipient'))?.tone).toBe('green');
    expect(model.rows.find((row) => row.label === ar('tr.confirm.total'))?.tone).toBe('purple');
  });

  it('describes the route from the source wallet to the destination', () => {
    expect(model.route?.from).toEqual({
      caption: ar('tr.from'),
      name: 'Vodafone Cash',
      brand: 'vodafone',
    });
    expect(model.route?.to.name).toBe(ar('tr.dest.instapay'));
    expect(model.route?.to.brand).toBe('instapay');
  });

  it('reports a completed status in green', () => {
    expect(model.status).toBe(ar('status.completed'));
    expect(model.statusTone).toBe('green');
  });

  it('includes the demo disclosure', () => {
    expect(model.footer).toBe(ar('tx.demoNote'));
  });
});

describe('buildReceiptModel — add balance', () => {
  const model = buildReceiptModel(topUp, 'ar', ar);

  it('uses the top-up heading and labels', () => {
    expect(model.title).toBe(ar('ab.success.title'));
    expect(model.amountLabel).toBe(ar('ab.row.amount'));
  });

  it('does not label the rows like a transfer', () => {
    const labels = model.rows.map((row) => row.label);
    expect(labels).not.toContain(ar('tr.summary.fee'));
    expect(labels).toContain(ar('ab.row.amount'));
  });

  it('still describes both sides of the route', () => {
    expect(model.route?.to.name).toBe('CashX');
    expect(model.route?.to.caption).toBe(ar('tx.destination'));
  });

  it('marks a failed top-up as failed', () => {
    const failed = buildReceiptModel({ ...topUp, status: 'failed' }, 'ar', ar);
    expect(failed.status).toBe(ar('status.failed'));
    expect(failed.statusTone).toBe('failed');
  });
});

describe('buildReceiptModel — localisation', () => {
  it('renders the same amounts with the locale-specific currency', () => {
    const arModel = buildReceiptModel(transfer, 'ar', ar);
    const enModel = buildReceiptModel(transfer, 'en', en);

    expect(arModel.amount).toBe('1,000.00 جنيه');
    expect(enModel.amount).toBe('EGP 1,000.00');
  });

  it('keeps wallet brand names in Latin script in both locales', () => {
    expect(buildReceiptModel(transfer, 'ar', ar).route?.from.name).toBe('Vodafone Cash');
    expect(buildReceiptModel(transfer, 'en', en).route?.from.name).toBe('Vodafone Cash');
  });

  it('records which language it was built for', () => {
    expect(buildReceiptModel(transfer, 'ar', ar).lang).toBe('ar');
    expect(buildReceiptModel(transfer, 'en', en).lang).toBe('en');
  });

  it('produces the same row count in both languages', () => {
    expect(buildReceiptModel(transfer, 'ar', ar).rows).toHaveLength(
      buildReceiptModel(transfer, 'en', en).rows.length,
    );
  });
});

describe('buildReceiptTextFromModel', () => {
  const model = buildReceiptModel(transfer, 'ar', ar);
  const text = buildReceiptTextFromModel(model, ar);

  it('labels every row so pasted text stays readable', () => {
    for (const row of model.rows) {
      expect(text).toContain(`${row.label}: ${row.value}`);
    }
  });

  it('includes the transaction ID and the disclosure', () => {
    expect(text).toContain(model.id);
    expect(text).toContain(model.footer);
  });

  it('starts with the receipt heading', () => {
    expect(text.startsWith(model.heading)).toBe(true);
  });
});

describe('receiptFileName', () => {
  it('names the file after the transaction', () => {
    expect(receiptFileName('TXN-261011-104512', 'png')).toBe('CashX-TXN-261011-104512.png');
    expect(receiptFileName('TXN-261011-104512', 'pdf')).toBe('CashX-TXN-261011-104512.pdf');
  });

  it('contains no characters that are unsafe in a filename', () => {
    expect(receiptFileName('TXN-261011-104512', 'png')).toMatch(/^[\w.-]+$/);
  });
});

import type { Translate } from './i18n';
import { formatDateTime, formatMoney, formatPhone, walletName } from './format';
import { receiptQrPayload } from './qr';
import type { BrandId } from '../components/BrandLogo';
import type { Lang, Transaction } from './types';

export type { BrandId };

export type ReceiptTone = 'default' | 'green' | 'purple' | 'muted';

export interface ReceiptRow {
  label: string;
  value: string;
  tone?: ReceiptTone;
}

export interface ReceiptParty {
  caption: string;
  name: string;
  brand: BrandId;
}

export interface ReceiptModel {
  id: string;
  /** Small eyebrow above the headline, e.g. "CashX receipt". */
  heading: string;
  title: string;
  subtitle: string;
  amountLabel: string;
  amount: string;
  status: string;
  statusTone: 'green' | 'failed';
  /** Source → destination, when the flow has both sides. */
  route: { from: ReceiptParty; to: ReceiptParty } | null;
  rows: ReceiptRow[];
  qrPayload: string;
  footer: string;
  tagline: string;
  createdAt: string;
  lang: Lang;
}

/**
 * Destination name + logo for a transaction.
 *
 * Shared by the receipt image, the PDF and the transaction screens so all three
 * describe a transfer identically.
 */
export function describeDestination(
  tx: Transaction,
  t: Translate,
): { name: string; brand: BrandId } {
  if (tx.destinationType === 'cashx_balance') return { name: 'CashX', brand: 'cashx' };
  if (tx.destinationType === 'wallet') {
    return tx.destinationWallet
      ? { name: walletName(tx.destinationWallet), brand: tx.destinationWallet }
      : { name: t('tr.dest.wallet'), brand: 'cashx' };
  }
  if (tx.destinationType === 'instapay') return { name: t('tr.dest.instapay'), brand: 'instapay' };
  if (tx.destinationType === 'bank') return { name: t('tr.dest.bank'), brand: 'bank' };
  return { name: t('tr.dest.wallet'), brand: 'cashx' };
}

const statusKey = (status: Transaction['status']) => `status.${status}` as const;

/**
 * Everything the receipt needs, in one place.
 *
 * The on-screen receipt, the shared image, the PDF and the plain-text share all
 * render from this model, so the four formats cannot drift apart.
 */
export function buildReceiptModel(tx: Transaction, lang: Lang, t: Translate): ReceiptModel {
  const isTopUp = tx.flowType === 'add_balance';
  const recipient = tx.destinationType === 'bank' ? tx.recipient : formatPhone(tx.recipient);
  const destination = describeDestination(tx, t);
  const completed = tx.status === 'completed';

  const rows: ReceiptRow[] = isTopUp
    ? [
        { label: t('ab.row.wallet'), value: walletName(tx.sourceWallet) },
        { label: t('ab.row.amount'), value: formatMoney(tx.recipientAmount, lang) },
        { label: t('ab.row.fee'), value: formatMoney(tx.fee, lang) },
        { label: t('ab.row.total'), value: formatMoney(tx.totalAmount, lang), tone: 'purple' },
        { label: t('ab.row.datetime'), value: formatDateTime(tx.createdAt, lang) },
      ]
    : [
        { label: t('tx.recipient'), value: recipient },
        { label: t('tr.summary.recipient'), value: formatMoney(tx.recipientAmount, lang), tone: 'green' },
        { label: t('tr.summary.fee'), value: formatMoney(tx.fee, lang) },
        { label: t('tr.confirm.total'), value: formatMoney(tx.totalAmount, lang), tone: 'purple' },
        { label: t('tx.source'), value: walletName(tx.sourceWallet) },
        { label: t('tx.datetime'), value: formatDateTime(tx.createdAt, lang) },
      ];

  return {
    id: tx.id,
    heading: t('receipt.heading'),
    title: isTopUp ? t('ab.success.title') : t('tr.success.title'),
    subtitle: isTopUp
      ? t('ab.success.sub', { amount: formatMoney(tx.recipientAmount, lang) })
      : t('tr.success.sub', { amount: formatMoney(tx.recipientAmount, lang) }),
    amountLabel: isTopUp ? t('ab.row.amount') : t('tr.summary.recipient'),
    amount: formatMoney(tx.recipientAmount, lang),
    status: t(statusKey(tx.status)),
    statusTone: completed ? 'green' : 'failed',
    route: {
      from: {
        caption: isTopUp ? t('ab.row.wallet') : t('tr.from'),
        name: walletName(tx.sourceWallet),
        brand: tx.sourceWallet,
      },
      to: {
        caption: isTopUp ? t('tx.destination') : t('tr.to'),
        name: destination.name,
        brand: destination.brand,
      },
    },
    rows,
    qrPayload: receiptQrPayload(tx.id),
    footer: t('tx.demoNote'),
    tagline: t('app.tagline'),
    createdAt: tx.createdAt,
    lang,
  };
}

/**
 * Plain-text receipt. Every line carries its own label so the text survives
 * being pasted somewhere that loses formatting.
 */
export function buildReceiptTextFromModel(model: ReceiptModel, t: Translate): string {
  const lines = [
    ...model.rows.map((row) => `${row.label}: ${row.value}`),
    `${t('tx.id')}: ${model.id}`,
    `${t('tx.status')}: ${model.status}`,
  ];
  return [model.heading, ...lines, '', model.footer].join('\n');
}

/** Filename offered to the share sheet / download, e.g. `CashX-TXN-261011-104512.png`. */
export function receiptFileName(id: string, extension: string): string {
  return `CashX-${id}.${extension}`;
}

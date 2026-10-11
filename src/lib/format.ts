import type { Lang, WalletId } from './types';
import { WALLETS } from './config';

/**
 * The reference screens use Latin (western) digits inside Arabic copy, so the
 * Arabic locale is forced to the `latn` numbering system.
 */
const AR_LATIN = 'ar-EG-u-nu-latn';

function locale(lang: Lang): string {
  return lang === 'ar' ? AR_LATIN : 'en-GB';
}

/** Currency word used in Arabic copy (English copy uses the ISO code). */
export function currencyWord(lang: Lang): string {
  return lang === 'ar' ? 'جنيه' : 'EGP';
}

/** Formats minor units as a decimal string, e.g. 100500 -> "1,005.00". */
export function formatNumber(minorUnits: number, lang: Lang, decimals = 2): string {
  return new Intl.NumberFormat(locale(lang), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(minorUnits / 100);
}

/** "1,005.00" — number only. */
export function formatAmount(minorUnits: number, lang: Lang): string {
  return formatNumber(minorUnits, lang);
}

/** Arabic: "1,005.00 جنيه" · English: "EGP 1,005.00". */
export function formatMoney(minorUnits: number, lang: Lang, withDecimals = true): string {
  const digits = withDecimals ? formatNumber(minorUnits, lang) : formatNumber(minorUnits, lang, 0);
  return lang === 'ar' ? `${digits} ${currencyWord(lang)}` : `${currencyWord(lang)} ${digits}`;
}

/** Compact form used inside tight cards, e.g. "+1,000". */
export function formatCompactAmount(minorUnits: number, lang: Lang): string {
  return formatNumber(minorUnits, lang, 0);
}

/**
 * Date + time, matching the reference layout: "24 مايو 2024 - 10:45 ص".
 * Always generated at runtime — never hardcoded.
 */
/**
 * Long date without the Arabic era suffix, e.g. "11 أكتوبر 2026" / "11 October 2026".
 * The reference screens show no era marker.
 */
export function formatLongDate(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(locale(lang), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
    .formatToParts(date)
    .filter((part) => part.type !== 'era')
    .map((part) => part.value)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatDateTime(iso: string, lang: Lang): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${formatLongDate(date, lang)} - ${formatTime(iso, lang)}`;
}

export function formatDate(iso: string, lang: Lang): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return formatLongDate(date, lang);
}

export function formatTime(iso: string, lang: Lang): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale(lang), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
    .format(date)
    .replace(/\u200f|\u200e/g, '');
}

/** "010 1234 5678" — keeps phone numbers readable in both directions. */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11) return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
  return digits || raw;
}

/** Human readable wallet label. Brand names stay in Latin script in both locales. */
export function walletName(id: WalletId): string {
  return WALLETS.find((wallet) => wallet.id === id)?.name ?? id;
}

/** Masking an account/IBAN for display. */
export function maskAccount(value: string): string {
  const digits = value.replace(/\s/g, '');
  if (digits.length <= 6) return digits;
  return `${digits.slice(0, 4)} •••• ${digits.slice(-4)}`;
}

/** Adds thousands separators to a raw input string without touching decimals. */
export function groupAmountInput(raw: string): string {
  if (!raw) return '';
  const [integer, ...rest] = raw.split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return rest.length > 0 ? `${grouped}.${rest.join('')}` : grouped;
}

/** Formats a phone number while it is typed: "01012345678" -> "010 1234 5678". */
export function formatPhoneTyping(value: string): string {
  const digits = normalizeDigits(value).replace(/\D/g, '').slice(0, 11);
  return [digits.slice(0, 3), digits.slice(3, 7), digits.slice(7, 11)]
    .filter(Boolean)
    .join(' ');
}

/** Strips Arabic-Indic digits and spaces so inputs can be validated reliably. */
export function normalizeDigits(value: string): string {
  const arabicIndic = '٠١٢٣٤٥٦٧٨٩';
  const easternIndic = '۰۱۲۳۴۵۶۷۸۹';
  return value
    .split('')
    .map((char) => {
      const ai = arabicIndic.indexOf(char);
      if (ai > -1) return String(ai);
      const ei = easternIndic.indexOf(char);
      if (ei > -1) return String(ei);
      return char;
    })
    .join('');
}

/** Parses a user typed amount ("1,000.5") into integer minor units. */
export function parseAmountInput(value: string): number {
  const cleaned = normalizeDigits(value).replace(/[^\d.]/g, '');
  if (!cleaned) return 0;
  const parsed = Number.parseFloat(cleaned);
  if (Number.isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

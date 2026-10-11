import { describe, expect, it } from 'vitest';
import { calculateFee } from './fee';
import {
  formatCompactAmount,
  formatDate,
  formatDateTime,
  formatLongDate,
  formatMoney,
  formatNumber,
  formatPhone,
  formatPhoneTyping,
  formatTime,
  groupAmountInput,
  maskAccount,
  normalizeDigits,
  parseAmountInput,
  walletName,
} from './format';

/**
 * Arabic copy in the reference screens uses Latin (western) digits, which is why
 * the Arabic locale is pinned to `ar-EG-u-nu-latn`. These are the digits
 * Arabic-Indic output would use — their absence is the actual requirement.
 */
const ARABIC_INDIC = /[\u0660-\u0669\u06F0-\u06F9]/;

describe('formatNumber / formatMoney — English', () => {
  it('formats minor units with a thousands separator and two decimals', () => {
    expect(formatNumber(100_500, 'en')).toBe('1,005.00');
    expect(formatNumber(100_000, 'en')).toBe('1,000.00');
    expect(formatNumber(0, 'en')).toBe('0.00');
  });

  it('puts the currency before the amount', () => {
    expect(formatMoney(100_000, 'en')).toBe('EGP 1,000.00');
  });

  it('drops the decimals when asked', () => {
    expect(formatMoney(100_000, 'en', false)).toBe('EGP 1,000');
    expect(formatCompactAmount(100_000, 'en')).toBe('1,000');
  });
});

describe('formatNumber / formatMoney — Arabic', () => {
  it('keeps Latin digits, as the reference screenshots do', () => {
    expect(formatNumber(100_500, 'ar')).toBe('1,005.00');
    expect(formatNumber(100_500, 'ar')).not.toMatch(ARABIC_INDIC);
  });

  it('puts the currency word after the amount', () => {
    expect(formatMoney(100_000, 'ar')).toBe('1,000.00 جنيه');
  });

  it('keeps Latin digits in large amounts too', () => {
    const formatted = formatMoney(5_000_000, 'ar');
    expect(formatted).toBe('50,000.00 جنيه');
    expect(formatted).not.toMatch(ARABIC_INDIC);
  });

  it('renders the same digits in both locales, only the currency word differs', () => {
    expect(formatNumber(123_456, 'ar')).toBe(formatNumber(123_456, 'en'));
  });
});

describe('the reference receipt chain, in both locales', () => {
  const fee = calculateFee(100_000);

  it('reads 1,000.00 / 5.00 / 1,005.00 in Arabic', () => {
    expect(formatMoney(fee.recipientAmount, 'ar')).toBe('1,000.00 جنيه');
    expect(formatMoney(fee.fee, 'ar')).toBe('5.00 جنيه');
    expect(formatMoney(fee.total, 'ar')).toBe('1,005.00 جنيه');
  });

  it('reads EGP 1,000.00 / EGP 5.00 / EGP 1,005.00 in English', () => {
    expect(formatMoney(fee.recipientAmount, 'en')).toBe('EGP 1,000.00');
    expect(formatMoney(fee.fee, 'en')).toBe('EGP 5.00');
    expect(formatMoney(fee.total, 'en')).toBe('EGP 1,005.00');
  });
});

/**
 * Dates are built from local-time components (no `Z`), so the assertions hold
 * regardless of the machine's timezone. The month names come from ICU, which
 * Node ships in full.
 */
describe('date and time', () => {
  const iso = '2026-10-11T22:45:00';

  it('formats a long date without the Arabic era suffix', () => {
    expect(formatLongDate(new Date(iso), 'ar')).toBe('11 أكتوبر 2026');
    expect(formatLongDate(new Date(iso), 'en')).toBe('11 October 2026');
  });

  it('drops any era marker the locale would otherwise add', () => {
    expect(formatLongDate(new Date(iso), 'ar')).not.toMatch(/هـ|م(?=\s|$)|AD|BC/);
  });

  it('formats the time with an Arabic or Latin meridiem', () => {
    expect(formatTime(iso, 'ar')).toBe('10:45 م');
    expect(formatTime(iso, 'en')).toBe('10:45 pm');
  });

  it('strips the bidi marks that would break RTL layout', () => {
    expect(formatTime(iso, 'ar')).not.toMatch(/[\u200e\u200f]/);
    expect(formatTime(iso, 'en')).not.toMatch(/[\u200e\u200f]/);
  });

  it('joins date and time the way the receipt rows do', () => {
    expect(formatDateTime(iso, 'ar')).toBe('11 أكتوبر 2026 - 10:45 م');
    expect(formatDateTime(iso, 'en')).toBe('11 October 2026 - 10:45 pm');
  });

  it('formats a date on its own', () => {
    expect(formatDate(iso, 'ar')).toBe('11 أكتوبر 2026');
  });

  it('degrades to a dash for an unparseable value instead of throwing', () => {
    expect(formatDateTime('not-a-date', 'ar')).toBe('—');
    expect(formatDate('not-a-date', 'en')).toBe('—');
    expect(formatTime('', 'en')).toBe('—');
  });
});

describe('phone numbers', () => {
  it('groups an 11-digit Egyptian mobile number', () => {
    expect(formatPhone('01012345678')).toBe('010 1234 5678');
  });

  it('groups a 10-digit number differently', () => {
    expect(formatPhone('0101234567')).toBe('01 0123 4567');
  });

  it('accepts an already-formatted number', () => {
    expect(formatPhone('010 1234 5678')).toBe('010 1234 5678');
  });

  it('falls back to the raw value when there are no digits', () => {
    expect(formatPhone('')).toBe('');
  });

  it('groups as the user types and caps the length', () => {
    expect(formatPhoneTyping('01012345678')).toBe('010 1234 5678');
    expect(formatPhoneTyping('010123456789999')).toBe('010 1234 5678');
    expect(formatPhoneTyping('010')).toBe('010');
  });

  it('accepts Arabic-Indic digits while typing', () => {
    expect(formatPhoneTyping('٠١٠١٢٣٤٥٦٧٨')).toBe('010 1234 5678');
  });
});

describe('amount input', () => {
  it('groups thousands without disturbing decimals', () => {
    expect(groupAmountInput('1000')).toBe('1,000');
    expect(groupAmountInput('1234567')).toBe('1,234,567');
    expect(groupAmountInput('1234567.5')).toBe('1,234,567.5');
    expect(groupAmountInput('')).toBe('');
  });

  it('parses a typed amount into integer minor units', () => {
    expect(parseAmountInput('1,000')).toBe(100_000);
    expect(parseAmountInput('1,000.5')).toBe(100_050);
    expect(parseAmountInput('1000.99')).toBe(100_099);
    expect(parseAmountInput('0.01')).toBe(1);
  });

  it('parses Arabic-Indic digits', () => {
    expect(parseAmountInput('١٠٠٠')).toBe(100_000);
    expect(normalizeDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
  });

  it('returns zero for empty or junk input rather than NaN', () => {
    expect(parseAmountInput('')).toBe(0);
    expect(parseAmountInput('abc')).toBe(0);
    expect(parseAmountInput('.')).toBe(0);
    expect(Number.isNaN(parseAmountInput('abc'))).toBe(false);
  });

  it('round-trips an amount through the input formatter', () => {
    for (const minor of [1, 100, 50_000, 100_000, 5_000_000]) {
      const typed = groupAmountInput(String(minor / 100));
      expect(parseAmountInput(typed)).toBe(minor);
    }
  });

  it('groups and parses consistently for the reference amount', () => {
    expect(parseAmountInput(groupAmountInput('1000'))).toBe(100_000);
  });
});

describe('labels and masking', () => {
  it('keeps wallet brand names in Latin script in both locales', () => {
    expect(walletName('vodafone')).toBe('Vodafone Cash');
    expect(walletName('we')).toBe('WE Pay');
  });

  it('falls back to the id for an unknown wallet', () => {
    expect(walletName('unknown' as never)).toBe('unknown');
  });

  it('masks an account number, keeping the ends readable', () => {
    expect(maskAccount('12345678901234')).toBe('1234 •••• 1234');
    expect(maskAccount('1234 5678 9012 3456')).toBe('1234 •••• 3456');
  });

  it('leaves short account numbers unmasked', () => {
    expect(maskAccount('123456')).toBe('123456');
  });
});

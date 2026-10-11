import type { DestinationType, WalletId } from './types';

/**
 * Fee rule used by the whole app (single source of truth).
 *
 * Reference example: the recipient receives EGP 1,000.00 and the CashX fee is
 * EGP 5.00, i.e. exactly 0.5% of the amount the recipient receives.
 * A minimum fee can be configured for small amounts; it is set to EGP 1.00
 * here, which does not affect the reference example.
 */
export const FEE_CONFIG = {
  /** Percentage of the recipient amount. */
  percentage: 0.5,
  /** Configurable floor, in minor units (piasters). EGP 1.00. */
  minimumFeeMinor: 100,
  /** Sweep the fee up to a whole piaster (no fractional piasters in EGP). */
  roundToMinorStep: 1,
  /** Set to 0 to disable the minimum fee entirely. */
  enabled: true,
} as const;

/** Demo amount limits, in minor units. */
export const AMOUNT_LIMITS = {
  min: 1_000, // EGP 10.00
  max: 5_000_000, // EGP 50,000.00
} as const;

/** Quick amount presets, in minor units (reference: +500, +1,000, +2,000, +5,000). */
export const QUICK_AMOUNTS = [50_000, 100_000, 200_000, 500_000] as const;

export const CURRENCY = 'EGP' as const;

/** Demo starting balance for the CashX wallet, in minor units. */
export const INITIAL_DEMO_BALANCE = 250_000; // EGP 2,500.00

/** The sample recipient shown in the reference screenshots. */
export const SAMPLE_PHONE = '01012345678';

export const WALLETS: { id: WalletId; name: string }[] = [
  { id: 'vodafone', name: 'Vodafone Cash' },
  { id: 'etisalat', name: 'Etisalat Cash' },
  { id: 'orange', name: 'Orange Cash' },
  { id: 'we', name: 'WE Pay' },
];

export const DESTINATIONS: { id: DestinationType; nameEn: string }[] = [
  { id: 'instapay', nameEn: 'InstaPay' },
  { id: 'bank', nameEn: 'Bank Account' },
  { id: 'wallet', nameEn: 'Electronic Wallet' },
];

export const BANKS = [
  { id: 'nbe', ar: 'البنك الأهلي المصري', en: 'National Bank of Egypt' },
  { id: 'misr', ar: 'بنك مصر', en: 'Banque Misr' },
  { id: 'cib', ar: 'البنك التجاري الدولي', en: 'CIB' },
  { id: 'bdcaire', ar: 'بنك القاهرة', en: 'Banque du Caire' },
  { id: 'alex', ar: 'بنك الإسكندرية', en: 'Alexbank' },
] as const;

export const DEMO_USER = {
  nameAr: 'مستخدم تجريبي',
  nameEn: 'Demo User',
  phone: '01012345678',
} as const;

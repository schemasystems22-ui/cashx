import { FEE_CONFIG } from './config';

export interface FeeBreakdown {
  /** What the recipient receives, in minor units. */
  recipientAmount: number;
  /** CashX fee, in minor units. */
  fee: number;
  /** recipientAmount + fee, in minor units. */
  total: number;
  /** Whether the minimum fee floor was applied. */
  minimumApplied: boolean;
  /** Percentage used, so the UI can label it without duplicating the rule. */
  percentage: number;
}

const clampMinor = (value: number) => Math.max(0, Math.round(value));

/**
 * Single fee rule for the whole demo.
 *
 *   fee = round(recipientAmount * 0.5%)   (never below FEE_CONFIG.minimumFeeMinor)
 *   total = recipientAmount + fee
 *
 * Reference example: 100000 minor units (EGP 1,000.00) → fee 500 (EGP 5.00),
 * total 100500 (EGP 1,005.00).
 */
export function calculateFee(recipientAmount: number, percentageOverride?: number): FeeBreakdown {
  const percentage = percentageOverride ?? FEE_CONFIG.percentage;
  const amount = clampMinor(recipientAmount);

  if (!FEE_CONFIG.enabled || amount <= 0) {
    return { recipientAmount: amount, fee: 0, total: amount, minimumApplied: false, percentage };
  }

  const raw = (amount * percentage) / 100;
  const step = Math.max(1, FEE_CONFIG.roundToMinorStep);
  const rounded = Math.ceil(raw / step) * step;
  const minimumApplied = rounded < FEE_CONFIG.minimumFeeMinor;
  const fee = clampMinor(Math.max(rounded, FEE_CONFIG.minimumFeeMinor));

  return {
    recipientAmount: amount,
    fee,
    total: amount + fee,
    minimumApplied,
    percentage,
  };
}

/** The maximum amount a recipient can receive given a source balance. */
export function maxRecipientAmountFor(balanceMinor: number): number {
  let low = 0;
  let high = Math.max(0, balanceMinor);
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (calculateFee(mid).total <= balanceMinor) low = mid;
    else high = mid;
  }
  return low;
}

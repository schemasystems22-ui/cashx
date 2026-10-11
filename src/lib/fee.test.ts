import { describe, expect, it } from 'vitest';
import { FEE_CONFIG } from './config';
import { calculateFee, maxRecipientAmountFor } from './fee';

/** The exact scenario from the reference screenshots, in minor units (piasters). */
const REFERENCE = { recipientAmount: 100_000, fee: 500, total: 100_500 };

describe('calculateFee — reference case', () => {
  it('reproduces the screenshot: EGP 1,000.00 → fee EGP 5.00 → total EGP 1,005.00', () => {
    const result = calculateFee(REFERENCE.recipientAmount);

    expect(result.recipientAmount).toBe(REFERENCE.recipientAmount);
    expect(result.fee).toBe(REFERENCE.fee);
    expect(result.total).toBe(REFERENCE.total);
  });

  it('does not apply the minimum floor at the reference amount', () => {
    expect(calculateFee(REFERENCE.recipientAmount).minimumApplied).toBe(false);
  });

  it('reports 0.5% so the UI label can never disagree with the number', () => {
    expect(calculateFee(REFERENCE.recipientAmount).percentage).toBe(0.5);
    expect(FEE_CONFIG.percentage).toBe(0.5);
  });
});

describe('calculateFee — percentage', () => {
  it.each([
    [50_000, 250],
    [100_000, 500],
    [200_000, 1_000],
    [500_000, 2_500],
  ])('charges 0.5%% on %i minor units → %i', (recipientAmount, fee) => {
    expect(calculateFee(recipientAmount).fee).toBe(fee);
  });

  it('keeps total exactly equal to recipient amount + fee', () => {
    for (let amount = 1_000; amount <= 500_000; amount += 997) {
      const result = calculateFee(amount);
      expect(result.total).toBe(result.recipientAmount + result.fee);
    }
  });

  it('never charges less as the amount grows', () => {
    let previous = 0;
    for (let amount = 1_000; amount <= 200_000; amount += 331) {
      const { fee } = calculateFee(amount);
      expect(fee).toBeGreaterThanOrEqual(previous);
      previous = fee;
    }
  });

  it('honours a percentage override and echoes it back for labelling', () => {
    const result = calculateFee(100_000, 1);
    expect(result.fee).toBe(1_000);
    expect(result.percentage).toBe(1);
    expect(result.total).toBe(101_000);
  });
});

describe('calculateFee — minimum fee floor', () => {
  it('applies the floor when 0.5% falls below it', () => {
    // 0.5% of EGP 100.00 is EGP 0.50, under the EGP 1.00 floor.
    const result = calculateFee(10_000);
    expect(result.fee).toBe(FEE_CONFIG.minimumFeeMinor);
    expect(result.minimumApplied).toBe(true);
    expect(result.total).toBe(10_000 + FEE_CONFIG.minimumFeeMinor);
  });

  it('flags the floor based on the rounded fee, not the raw percentage', () => {
    // EGP 200.00 is where 0.5% equals the EGP 1.00 floor exactly.
    const boundary = FEE_CONFIG.minimumFeeMinor / (FEE_CONFIG.percentage / 100);
    expect(boundary).toBe(20_000);
    expect(calculateFee(boundary).minimumApplied).toBe(false);

    // One piaster below the boundary the percentage rounds *up* to the floor, so
    // the floor is no longer what set the fee — only the flag changes, not the
    // fee. `minimumApplied` therefore tells you which rule produced the number.
    expect(calculateFee(boundary - 1).fee).toBe(FEE_CONFIG.minimumFeeMinor);
    expect(calculateFee(boundary - 1).minimumApplied).toBe(false);

    // From here down the percentage alone would under-charge, so the floor holds it up.
    expect(calculateFee(19_800).fee).toBe(FEE_CONFIG.minimumFeeMinor);
    expect(calculateFee(19_800).minimumApplied).toBe(true);
  });

  it('keeps the fee exactly at the floor throughout the whole floored range', () => {
    for (let amount = 1_000; amount <= 19_800; amount += 259) {
      expect(calculateFee(amount).minimumApplied).toBe(true);
    }
  });

  it('never charges above the floor when it does apply', () => {
    for (let amount = 1_000; amount < 20_000; amount += 137) {
      expect(calculateFee(amount).fee).toBe(FEE_CONFIG.minimumFeeMinor);
    }
  });
});

describe('calculateFee — degenerate amounts', () => {
  it('charges nothing when there is nothing to send', () => {
    // The floor must not turn an empty amount into a chargeable one.
    const result = calculateFee(0);
    expect(result).toEqual({
      recipientAmount: 0,
      fee: 0,
      total: 0,
      minimumApplied: false,
      percentage: FEE_CONFIG.percentage,
    });
  });

  it('clamps negative amounts up to zero', () => {
    expect(calculateFee(-50_000)).toEqual(calculateFee(0));
  });

  it('rounds fractional minor units rather than passing them through', () => {
    expect(calculateFee(1_000.4).recipientAmount).toBe(1_000);
    expect(calculateFee(1_000.6).recipientAmount).toBe(1_001);
  });
});

describe('calculateFee — currency precision', () => {
  it('sweeps the fee up to a whole piaster', () => {
    // 0.5% of 100,001 piasters is 500.005 — a fraction of a piaster cannot exist.
    expect(calculateFee(100_001).fee).toBe(501);
  });

  it('always returns a whole number of piasters', () => {
    for (let amount = 1_000; amount <= 300_000; amount += 91) {
      const { fee, total } = calculateFee(amount);
      expect(Number.isInteger(fee)).toBe(true);
      expect(Number.isInteger(total)).toBe(true);
    }
  });

  it('rounds up rather than down, so the fee never under-charges', () => {
    const fee = calculateFee(100_001, 0.1234).fee;
    expect(fee).toBe(124); // 123.401234 swept up
    expect(fee).toBeGreaterThan(123);
  });
});

describe('maxRecipientAmountFor', () => {
  it('finds the largest amount whose fee-inclusive total fits a demo balance', () => {
    expect(maxRecipientAmountFor(REFERENCE.total)).toBe(REFERENCE.recipientAmount);
  });

  it('returns an amount whose total fits, where one more piaster would not', () => {
    for (const balance of [10_000, 100_500, 250_000, 1_000_000]) {
      const max = maxRecipientAmountFor(balance);
      expect(calculateFee(max).total).toBeLessThanOrEqual(balance);
      expect(calculateFee(max + 1).total).toBeGreaterThan(balance);
    }
  });

  it('returns zero when the balance cannot cover the minimum fee', () => {
    expect(maxRecipientAmountFor(50)).toBe(0);
    expect(maxRecipientAmountFor(0)).toBe(0);
    expect(maxRecipientAmountFor(-1)).toBe(0);
  });
});

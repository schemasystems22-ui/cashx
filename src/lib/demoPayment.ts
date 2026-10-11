import { createPaymentReference } from './ids';
import type { PaymentAdapter, PaymentRequest, PaymentResult } from './types';

export interface DemoAdapterOptions {
  /** Force a failed outcome so the demo can exercise the failure path. */
  simulateFailure?: boolean;
  /** How long the simulated processing takes. */
  delayMs?: number;
}

/**
 * A deliberately fake payment provider.
 *
 * It never contacts a wallet operator, never asks for a PIN or OTP and never
 * moves money. Swapping this object for a real, authorised adapter is the only
 * change required to go live.
 */
export function createDemoPaymentAdapter(options: DemoAdapterOptions = {}): PaymentAdapter {
  const { simulateFailure = false, delayMs = 1500 } = options;

  return {
    name: 'cashx-demo-adapter',
    async process(request: PaymentRequest): Promise<PaymentResult> {
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      if (simulateFailure) {
        return {
          outcome: 'failed',
          reference: createPaymentReference(),
          message: 'demo_payment_declined',
        };
      }

      if (request.amount <= 0) {
        return {
          outcome: 'failed',
          reference: createPaymentReference(),
          message: 'demo_invalid_amount',
        };
      }

      return {
        outcome: 'success',
        reference: createPaymentReference(),
      };
    },
  };
}

/** Default adapter instance used by the demo (always succeeds). */
export const demoPaymentAdapter = createDemoPaymentAdapter();

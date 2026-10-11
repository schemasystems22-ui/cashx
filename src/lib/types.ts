/** Supported UI languages. */
export type Lang = 'ar' | 'en';

/** Source wallet brands supported by the demo. */
export type WalletId = 'vodafone' | 'etisalat' | 'orange' | 'we';

/** Destination rails supported by the demo. */
export type DestinationType = 'instapay' | 'bank' | 'wallet';

/** Where a transaction came from. */
export type FlowType = 'add_balance' | 'transfer';

export type TxStatus =
  | 'draft'
  | 'awaiting_confirmation'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * A single demo transaction. Amounts are stored as integer minor units
 * (piasters) so no floating point arithmetic ever touches money.
 */
export interface Transaction {
  id: string;
  flowType: FlowType;
  /** Wallet the money leaves from (for add-balance this is the funding wallet). */
  sourceWallet: WalletId;
  /** Destination rail, or the CashX balance itself for top-ups. */
  destinationType: DestinationType | 'cashx_balance';
  /** Destination wallet brand, only for `wallet` destinations. */
  destinationWallet?: WalletId;
  /** Phone number / IBAN / wallet number, depending on the rail. */
  recipient: string;
  recipientName?: string;
  bankName?: string;
  /** What the recipient receives, in minor units. */
  recipientAmount: number;
  /** CashX fee in minor units. */
  fee: number;
  /** recipientAmount + fee, in minor units. */
  totalAmount: number;
  currency: 'EGP';
  status: TxStatus;
  createdAt: string;
  completedAt?: string;
  /** Always true in this build — nothing is ever a real payment. */
  isDemo: true;
}

/** Result returned by the demo payment adapter. */
export interface PaymentResult {
  outcome: 'success' | 'failed' | 'pending';
  reference: string;
  message?: string;
}

/** Anything the payment adapter needs to "charge" a wallet. */
export interface PaymentRequest {
  wallet: WalletId;
  /** Total amount to charge, in minor units. */
  amount: number;
  /** Purely informational, shown in the demo receipt. */
  description: string;
}

/**
 * Payment provider boundary. The screens only ever talk to this interface,
 * so a real, authorised provider can be plugged in later without touching UI.
 */
export interface PaymentAdapter {
  readonly name: string;
  process(request: PaymentRequest): Promise<PaymentResult>;
}

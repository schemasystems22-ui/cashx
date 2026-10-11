import { useMemo, useState } from 'react';
import { AMOUNT_LIMITS, QUICK_AMOUNTS } from '../lib/config';
import { createDemoPaymentAdapter } from '../lib/demoPayment';
import { calculateFee } from '../lib/fee';
import { formatDateTime, formatMoney, parseAmountInput, walletName } from '../lib/format';
import { createTransactionId } from '../lib/ids';
import { focusFirstAvailable } from '../lib/a11y';
import { buildReceiptModel, buildReceiptTextFromModel } from '../lib/receipt';
import { whatsAppReceipt } from '../lib/receiptExport';
import type { Transaction, WalletId } from '../lib/types';
import { useApp, useFlowStage } from '../state/store';
import { BrandLogo } from '../components/BrandLogo';
import { BottomNavigation, CashXHeader, StepProgress, type StepItem } from '../components/Chrome';
import { StepTransition } from '../components/StepTransition';
import { CopyButton } from '../components/CopyButton';
import { ReceiptQrPanel } from '../components/ReceiptExport';
import {
  AmountInput,
  BalanceCard,
  DemoBadge,
  DetailRow,
  FeeSummary,
  InfoNotice,
  PrimaryActionButton,
  QuickAmountButtons,
  SuccessPanel,
  WalletSelector,
} from '../components/Form';
import {
  CalendarIcon,
  CardIcon,
  DownloadIcon,
  EditIcon,
  HomeIcon,
  MoneyIcon,
  PercentIcon,
  ReceiptIcon,
  WhatsAppIcon,
} from '../components/icons';

/** Ids the validation pass uses to send focus to the field that needs fixing. */
const AB_IDS = {
  wallet: 'cx-ab-wallet',
  amount: 'cx-ab-amount',
  error: 'cx-ab-error',
} as const;

/** A validation message plus the field it belongs to. */
type FormError = { field: 'wallet' | 'amount'; message: string } | null;

export function AddBalanceScreen({
  onOpenNav,
  onOpenNotifications,
}: {
  onOpenNav: () => void;
  onOpenNotifications: () => void;
}) {
  const {
    t,
    lang,
    addTransaction,
    creditBalance,
    navigate,
    showToast,
    balance,
    simulateFailure,
    openReceiptExport,
    announce,
  } = useApp();

  // 'review' is step 2; a deep link to `step=2` opens it, and `step=3` (not
  // restorable — there is no confirmed transaction behind it) also lands here.
  const { stage, setStage } = useFlowStage('review');
  const [wallet, setWallet] = useState<WalletId | null>('vodafone');
  const [amountText, setAmountText] = useState('1000');
  const [error, setError] = useState<FormError>(null);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sharing, setSharing] = useState(false);

  const amountMinor = useMemo(() => parseAmountInput(amountText), [amountText]);
  const fee = useMemo(() => calculateFee(amountMinor), [amountMinor]);

  const steps: StepItem[] =
    stage === 'success'
      ? [
          { label: t('abs.step1'), state: 'done' },
          { label: t('abs.step2'), state: 'done' },
          { label: t('abs.step3'), state: 'active' },
        ]
      : stage === 'form'
        ? [
            { label: t('abs.step1'), state: 'active' },
            { label: t('abs.step2'), state: 'todo' },
            { label: t('abs.step3'), state: 'todo' },
          ]
        : [
            { label: t('abs.step1'), state: 'done' },
            { label: t('abs.step2'), state: 'active' },
            { label: t('abs.step3'), state: 'todo' },
          ];

  /**
   * Validates and, on failure, moves focus to the offending control. The button
   * that was pressed stays put; the user lands on the field to fix and hears the
   * message through that field's `aria-describedby`.
   */
  const validate = (): boolean => {
    if (!wallet) {
      setError({ field: 'wallet', message: t('err.wallet') });
      focusFirstAvailable([AB_IDS.wallet]);
      return false;
    }
    if (amountMinor < AMOUNT_LIMITS.min) {
      setError({
        field: 'amount',
        message: t('err.amountMin', { min: formatMoney(AMOUNT_LIMITS.min, lang) }),
      });
      focusFirstAvailable([AB_IDS.amount]);
      return false;
    }
    if (amountMinor > AMOUNT_LIMITS.max) {
      setError({
        field: 'amount',
        message: t('err.amountMax', { max: formatMoney(AMOUNT_LIMITS.max, lang) }),
      });
      focusFirstAvailable([AB_IDS.amount]);
      return false;
    }
    setError(null);
    return true;
  };

  const goToReview = () => {
    if (!validate()) return;
    setStage('review');
  };

  /** Runs the simulated top-up through the demo payment adapter. */
  const confirmTopUp = async () => {
    if (!wallet || !validate()) return;
    setSubmitting(true);
    setStage('processing');

    const adapter = createDemoPaymentAdapter({ simulateFailure, delayMs: 1400 });
    const result = await adapter.process({
      wallet,
      amount: fee.total,
      description: 'add_balance',
    });

    const now = new Date();
    const record: Transaction = {
      id: createTransactionId(now),
      flowType: 'add_balance',
      sourceWallet: wallet,
      destinationType: 'cashx_balance',
      recipient: '01012345678',
      recipientAmount: fee.recipientAmount,
      fee: fee.fee,
      totalAmount: fee.total,
      currency: 'EGP',
      status: result.outcome === 'success' ? 'completed' : 'failed',
      createdAt: now.toISOString(),
      completedAt: result.outcome === 'success' ? now.toISOString() : undefined,
      isDemo: true,
    };

    addTransaction(record);
    setSubmitting(false);

    if (result.outcome === 'success') {
      creditBalance(fee.recipientAmount);
      setTransaction(record);
      setStage('success');
    } else {
      setError({ field: 'amount', message: t('err.failed') });
      // Nothing was focused by the step change from the processing screen back
      // to the review step, so the failure has to be spoken explicitly.
      announce(t('err.failed'), 'assertive');
      setStage('review');
    }
  };

  /* The receipt the success step will send. Built from the transaction the user
     actually confirmed, so the message and the card cannot disagree. */
  const receipt = transaction ? buildReceiptModel(transaction, lang, t) : null;

  const onWhatsApp = async () => {
    if (!receipt || sharing) return;
    setSharing(true);
    try {
      const outcome = await whatsAppReceipt(receipt, buildReceiptTextFromModel(receipt, t));
      if (outcome === 'opened') showToast(t('whatsapp.opened'));
      else if (outcome === 'failed') showToast(t('export.failed'));
    } catch {
      showToast(t('export.failed'));
    } finally {
      setSharing(false);
    }
  };

  /* Names the step for assistive technology when focus follows a step change.
     Success and failure steps name the outcome rather than the step number. */
  const stepLabel =
    stage === 'processing'
      ? t('a11y.processing')
      : t('a11y.stepOf', {
          current: stage === 'form' ? 1 : stage === 'review' ? 2 : 3,
          total: 3,
          label:
            stage === 'success'
              ? t('ab.success.title')
              : stage === 'review'
                ? t('abs.step2')
                : t('abs.step1'),
        });

  return (
    <>
      <CashXHeader
        leading="menu"
        trailing="bell"
        title={t('ab.title')}
        subtitle={t('ab.subtitle')}
        walletTile
        onLeading={onOpenNav}
        onTrailing={onOpenNotifications}
        onBack={stage === 'form' ? () => navigate({ name: 'home' }) : () => setStage('form')}
      />

      <div className="cx-body" role="main">
        {/* Remounts per stage so the enter animation replays between steps. */}
        <StepTransition key={stage} stageKey={stage} label={stepLabel}>
          <StepProgress steps={steps} />

          {stage === 'form' ? (
            <>
              <h2 className="cx-label">
                <span>{t('ab.selectWallet')}</span>
              </h2>
              <WalletSelector
                id={AB_IDS.wallet}
                value={wallet}
                layout="grid"
                ariaLabel={t('ab.selectWallet')}
                describedBy={error?.field === 'wallet' ? AB_IDS.error : undefined}
                onChange={(next) => {
                  setWallet(next);
                  setError(null);
                }}
              />

              <h2 className="cx-label">
                <span>{t('ab.enterAmount')}</span>
              </h2>
              <AmountInput
                id={AB_IDS.amount}
                value={amountText}
                onChange={(next) => {
                  setAmountText(next);
                  setError(null);
                }}
                invalid={error?.field === 'amount'}
                describedBy={error?.field === 'amount' ? AB_IDS.error : undefined}
                ariaLabel={t('ab.amountLabel')}
              />

              {error ? <InfoNotice id={AB_IDS.error}>{error.message}</InfoNotice> : null}

              <FeeSummary
                amountLabel={t('ab.amountLabel')}
                amountValue={formatMoney(fee.recipientAmount, lang)}
                feeLabel={t('ab.fee')}
                feeValue={formatMoney(fee.fee, lang)}
                totalLabel={t('ab.total')}
                totalValue={formatMoney(fee.total, lang)}
              />

              <InfoNotice>{t('ab.notice1')}</InfoNotice>

              <PrimaryActionButton
                label={t('ab.charge', { wallet: wallet ? walletName(wallet) : '' })}
                brand
                disabled={!wallet}
                onClick={goToReview}
              />
            </>
          ) : null}

          {stage === 'review' ? (
            <>
              <div
                className="cx-card cx-card--lilac"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
              >
                <BrandLogo id={wallet ?? 'vodafone'} size="lg" />
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    textAlign: 'start',
                  }}
                >
                  <span className="cx-route__caption">{t('ab.selectedWallet')}</span>
                  <span className="cx-route__name">{wallet ? walletName(wallet) : '—'}</span>
                  <button type="button" className="cx-linkbtn" onClick={() => setStage('form')}>
                    <EditIcon size={15} />
                    {t('ab.changeWallet')}
                  </button>
                </div>
              </div>

              <h2 className="cx-label">
                <span>{t('ab.enterAmount')}</span>
              </h2>
              <AmountInput
                id={AB_IDS.amount}
                value={amountText}
                onChange={(next) => {
                  setAmountText(next);
                  setError(null);
                }}
                invalid={error?.field === 'amount'}
                describedBy={error?.field === 'amount' ? AB_IDS.error : undefined}
                ariaLabel={t('ab.amountLabel')}
              />
              <QuickAmountButtons
                amounts={QUICK_AMOUNTS}
                selected={amountMinor}
                ariaLabel={t('ab.quickAmounts')}
                onPick={(value) => {
                  setAmountText(String(value / 100));
                  setError(null);
                }}
              />

              <FeeSummary
                title={t('ab.summary')}
                divider
                amountLabel={t('ab.amountLabel')}
                amountValue={formatMoney(fee.recipientAmount, lang)}
                feeLabel={t('ab.fee')}
                feeValue={formatMoney(fee.fee, lang)}
                totalLabel={t('ab.total')}
                totalValue={formatMoney(fee.total, lang)}
              />

              <InfoNotice>
                {t('ab.notice2', {
                  amount: formatMoney(fee.recipientAmount, lang),
                  total: formatMoney(fee.total, lang),
                })}
              </InfoNotice>

              {error ? <InfoNotice id={AB_IDS.error}>{error.message}</InfoNotice> : null}

              <PrimaryActionButton
                label={t('ab.next')}
                brand
                loading={submitting}
                onClick={confirmTopUp}
              />
            </>
          ) : null}

          {stage === 'processing' ? (
            <div className="cx-processing">
              <span className="cx-processing__ring">
                <span className="cx-spinner cx-spinner--dark" />
              </span>
              <span className="cx-processing__title">{t('ab.processing')}</span>
              <span className="cx-processing__sub">{t('ab.processingSub')}</span>
            </div>
          ) : null}

          {stage === 'success' && transaction ? (
            <>
              <SuccessPanel
                title={t('ab.success.title')}
                sub={
                  <>
                    {t('ab.success.sub', { amount: formatMoney(transaction.recipientAmount, lang) })}{' '}
                    <DemoBadge label={t('common.demo')} />
                  </>
                }
              >
                <BalanceCard label={t('ab.currentBalance')} amount={balance} lang={lang} />
              </SuccessPanel>

              <section className="cx-card">
                <div className="cx-row-between">
                  <h2 className="cx-card__title">{t('ab.details')}</h2>
                  <span className="cx-status cx-status--completed">{t('status.completed')}</span>
                </div>
                <div className="cx-details">
                  <DetailRow
                    icon={<CardIcon size={17} />}
                    label={t('ab.row.wallet')}
                    value={
                      <>
                        <span>{walletName(transaction.sourceWallet)}</span>
                        <BrandLogo id={transaction.sourceWallet} size="xs" />
                      </>
                    }
                  />
                  <DetailRow
                    icon={<MoneyIcon size={17} />}
                    label={t('ab.row.amount')}
                    value={formatMoney(transaction.recipientAmount, lang)}
                  />
                  <DetailRow
                    icon={<PercentIcon size={17} />}
                    label={t('ab.row.fee')}
                    value={`${formatMoney(transaction.fee, lang)} (0.5%)`}
                  />
                  <DetailRow
                    icon={<CardIcon size={17} />}
                    label={t('ab.row.total')}
                    tone="purple"
                    value={formatMoney(transaction.totalAmount, lang)}
                  />
                  <DetailRow
                    icon={<CalendarIcon size={17} />}
                    label={t('ab.row.datetime')}
                    mono
                    value={formatDateTime(transaction.createdAt, lang)}
                  />
                  <DetailRow
                    icon={<ReceiptIcon size={17} />}
                    label={t('ab.row.txnid')}
                    mono
                    value={transaction.id}
                    action={<CopyButton value={transaction.id} label={t('ab.row.txnid')} />}
                  />
                </div>
              </section>

              <ReceiptQrPanel value={transaction.id} />

              <InfoNotice>{t('ab.notice3')}</InfoNotice>

              <div className="cx-actions">
                <button
                  type="button"
                  className="cx-btn cx-btn--secondary cx-btn--sm"
                  onClick={() => navigate({ name: 'home' })}
                  style={{ gap: 8, justifyContent: 'center', padding: '10px 12px' }}
                >
                  <HomeIcon size={18} />
                  {t('ab.goHome')}
                </button>
                <button
                  type="button"
                  className="cx-btn cx-btn--primary cx-btn--sm"
                  onClick={() => navigate({ name: 'transfer', step: 1 })}
                  style={{ gap: 8, justifyContent: 'center', padding: '10px 12px' }}
                >
                  {t('ab.transferNow')}
                </button>
              </div>

              <div className="cx-actions">
                <button
                  type="button"
                  className="cx-btn cx-btn--whatsapp cx-btn--sm"
                  onClick={onWhatsApp}
                  disabled={sharing}
                  style={{ gap: 8, justifyContent: 'center', padding: '10px 12px' }}
                >
                  {sharing ? <span className="cx-spinner" /> : <WhatsAppIcon size={17} />}
                  {t('whatsapp.action')}
                </button>
                <button
                  type="button"
                  className="cx-btn cx-btn--secondary cx-btn--sm"
                  onClick={() => openReceiptExport(transaction.id)}
                  style={{ gap: 8, justifyContent: 'center', padding: '10px 12px' }}
                >
                  <DownloadIcon size={16} />
                  {t('export.action')}
                </button>
              </div>
            </>
          ) : null}
        </StepTransition>
      </div>

      <BottomNavigation active="transfer" />
    </>
  );
}

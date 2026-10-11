import { useMemo, useState } from 'react';
import { AMOUNT_LIMITS, BANKS, QUICK_AMOUNTS } from '../lib/config';
import { createDemoPaymentAdapter } from '../lib/demoPayment';
import { calculateFee } from '../lib/fee';
import {
  formatDateTime,
  formatMoney,
  formatPhone,
  formatPhoneTyping,
  normalizeDigits,
  parseAmountInput,
  walletName,
} from '../lib/format';
import { createTransactionId } from '../lib/ids';
import { focusFirstAvailable } from '../lib/a11y';
import { buildReceiptModel, buildReceiptTextFromModel } from '../lib/receipt';
import { whatsAppReceipt } from '../lib/receiptExport';
import type { DestinationType, Transaction, WalletId } from '../lib/types';
import { useApp, useFlowStage } from '../state/store';
import { BrandLogo, type BrandId } from '../components/BrandLogo';
import { BottomNavigation, CashXHeader, type StepItem } from '../components/Chrome';
import { StepTransition } from '../components/StepTransition';
import { CopyButton } from '../components/CopyButton';
import {
  AmountInput,
  DemoFailureToggle,
  DestinationSelector,
  DetailRow,
  FeeSummary,
  InfoNotice,
  PhoneContactButton,
  PhoneLeadingIcon,
  PrimaryActionButton,
  QuickAmountButtons,
  RatingRow,
  RoutePair,
  SecurityNotice,
  SuccessPanel,
  TextField,
  WalletSelector,
} from '../components/Form';
import { ReceiptQrPanel } from '../components/ReceiptExport';
import {
  CalendarIcon,
  CardIcon,
  CheckCircleIcon,
  ClockIcon,
  DownloadIcon,
  EditIcon,
  HomeIcon,
  LockIcon,
  MoneyIcon,
  PercentIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  UserIcon,
  WhatsAppIcon,
  ZapIcon,
} from '../components/icons';
type FieldErrors = Partial<Record<'phone' | 'amount' | 'name' | 'account' | 'bank' | 'destWallet', string>>;

/** Focus targets for a failed validation pass, keyed by the field they fix. */
const TR_IDS = {
  phone: 'cx-tr-phone',
  name: 'cx-tr-name',
  account: 'cx-tr-account',
  bank: 'cx-tr-bank',
  destWallet: 'cx-tr-destwallet',
  amount: 'cx-tr-amount',
  amountError: 'cx-tr-amount-error',
} as const;

export function TransferScreen({
  onOpenHelp,
  onClose,
}: {
  onOpenHelp: () => void;
  onClose: () => void;
}) {
  const {
    t,
    lang,
    addTransaction,
    navigate,
    showToast,
    simulateFailure,
    setSimulateFailure,
    setLastWallet,
    openReceiptExport,
  } = useApp();


  // 'confirm' is step 2; a deep link to `step=2` opens it with the reference
  // defaults already filled in, and `step=3` (not restorable) also lands here.
  const { stage, setStage } = useFlowStage('confirm');
  const [sourceWallet, setSourceWallet] = useState<WalletId>('vodafone');
  const [destinationType, setDestinationType] = useState<DestinationType>('instapay');
  const [destWallet, setDestWallet] = useState<WalletId | null>('etisalat');
  const [phone, setPhone] = useState('010 1234 5678');
  const [holderName, setHolderName] = useState('');
  const [account, setAccount] = useState('');
  const [bankId, setBankId] = useState<string>(BANKS[0].id);
  const [amountText, setAmountText] = useState('1000');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [sharing, setSharing] = useState(false);

  const amountMinor = useMemo(() => parseAmountInput(amountText), [amountText]);
  const fee = useMemo(() => calculateFee(amountMinor), [amountMinor]);

  const destinationLabel =
    destinationType === 'instapay'
      ? t('tr.dest.instapay')
      : destinationType === 'bank'
        ? t('tr.dest.bank')
        : t('tr.dest.wallet');

  const destinationLogo: BrandId =
    destinationType === 'bank'
      ? 'bank'
      : destinationType === 'instapay'
        ? 'instapay'
        : destWallet ?? 'etisalat';

  const recipientDisplay =
    destinationType === 'bank' ? (account ? account : '—') : formatPhone(phone);

  const steps: StepItem[] =
    stage === 'success'
      ? [
          { label: t('tr.step1'), state: 'done' },
          { label: t('tr.step2'), state: 'done' },
          { label: t('tr.step3'), state: 'active' },
        ]
      : stage === 'form'
        ? [
            { label: t('tr.step1'), state: 'active' },
            { label: t('tr.step2'), state: 'todo' },
          ]
        : [
            { label: t('tr.step1'), state: 'done' },
            { label: t('tr.step2'), state: 'active' },
          ];

  const validate = (): boolean => {
    const next: FieldErrors = {};
    const digits = normalizeDigits(phone).replace(/\D/g, '');

    if (destinationType !== 'bank') {
      if (!/^01\d{9}$/.test(digits)) next.phone = t('err.phone');
    }
    if (destinationType === 'bank') {
      if (!holderName.trim()) next.name = t('err.name');
      const accountDigits = normalizeDigits(account).replace(/\s/g, '');
      if (accountDigits.replace(/\D/g, '').length < 8) next.account = t('err.account');
      if (!bankId) next.bank = t('err.bank');
    }
    if (destinationType === 'wallet' && !destWallet) next.destWallet = t('err.destinationWallet');

    if (amountMinor < AMOUNT_LIMITS.min) {
      next.amount = t('err.amountMin', { min: formatMoney(AMOUNT_LIMITS.min, lang) });
    } else if (amountMinor > AMOUNT_LIMITS.max) {
      next.amount = t('err.amountMax', { max: formatMoney(AMOUNT_LIMITS.max, lang) });
    }

    setErrors(next);
    if (Object.keys(next).length === 0) return true;

    // Land on the first field (in reading order) that needs attention, so the
    // message is heard through that field's aria-describedby instead of being
    // left behind on the button that was pressed.
    const targets: (string | null)[] = [
      next.phone ? TR_IDS.phone : null,
      next.name ? TR_IDS.name : null,
      next.account ? TR_IDS.account : null,
      next.bank ? TR_IDS.bank : null,
      next.destWallet ? TR_IDS.destWallet : null,
      next.amount ? TR_IDS.amount : null,
    ];
    focusFirstAvailable(targets.filter((id): id is string => id !== null));
    return false;
  };

  const goToConfirm = () => {
    if (!validate()) return;
    setStage('confirm');
  };

  const runPayment = async () => {
    setSubmitting(true);
    setStage('processing');
    setLastWallet(sourceWallet);

    const adapter = createDemoPaymentAdapter({ simulateFailure, delayMs: 1600 });
    const result = await adapter.process({
      wallet: sourceWallet,
      amount: fee.total,
      description: 'transfer',
    });

    const now = new Date();
    const record: Transaction = {
      id: createTransactionId(now),
      flowType: 'transfer',
      sourceWallet,
      destinationType,
      destinationWallet: destinationType === 'wallet' ? (destWallet ?? undefined) : undefined,
      recipient: destinationType === 'bank' ? account : normalizeDigits(phone).replace(/\D/g, ''),
      recipientName: holderName.trim() || undefined,
      bankName: destinationType === 'bank' ? BANKS.find((b) => b.id === bankId)?.[lang] : undefined,
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
      setTransaction(record);
      setStage('success');
    } else {
      setTransaction(record);
      setStage('failed');
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

  /* Names the step for assistive technology when focus follows a step change,
     so the outcome of a simulated payment is announced, not just displayed. */
  const stepLabel =
    stage === 'processing'
      ? t('a11y.processing')
      : t('a11y.stepOf', {
          current: stage === 'form' ? 1 : stage === 'failed' ? 3 : stage === 'confirm' ? 2 : 3,
          total: 3,
          label:
            stage === 'success'
              ? t('tr.success.title')
              : stage === 'failed'
                ? t('tr.failed.title')
                : stage === 'confirm'
                  ? t('tr.step2')
                  : t('tr.step1'),
        });

  return (
    <>
      <CashXHeader
        leading="back"
        trailing="help"
        steps={steps}
        onLeading={onClose}
        onTrailing={onOpenHelp}
      />

      <div className="cx-body" role="main">
        {/* The header carries no title of its own here, so the screen would
            otherwise have no h1 to anchor its heading outline. */}
        <h1 className="cx-visually-hidden">{t('nav.transfer')}</h1>
        {/* Remounts per stage so the enter animation replays between steps. */}
        <StepTransition key={stage} stageKey={stage} label={stepLabel}>
          {stage === 'form' ? (
            <>
              <h2 className="cx-label">
                <span className="cx-dot" />
                <span>{t('tr.from')}</span>
              </h2>
              <WalletSelector
                value={sourceWallet}
                layout="row"
                ariaLabel={t('tr.from')}
                onChange={setSourceWallet}
              />

              <h2 className="cx-label">
                <span className="cx-dot" />
                <span>{t('tr.to')}</span>
              </h2>
              <DestinationSelector
                value={destinationType}
                ariaLabel={t('tr.to')}
                onChange={(next) => {
                  setDestinationType(next);
                  setErrors({});
                }}
              />

              {destinationType === 'instapay' ? (
                <TextField
                  id={TR_IDS.phone}
                  label={t('tr.instapay.label')}
                  value={phone}
                  onChange={(next) => {
                    setPhone(next);
                    setErrors((prev) => ({ ...prev, phone: undefined }));
                  }}
                  variant="phone"
                  inputMode="tel"
                  maxLength={13}
                  transform={formatPhoneTyping}
                  icon={<PhoneLeadingIcon />}
                  trailing={<PhoneContactButton />}
                  hint={t('tr.instapay.hint')}
                  error={errors.phone}
                />
              ) : null}

              {destinationType === 'bank' ? (
                <>
                  <TextField
                    id={TR_IDS.name}
                    label={t('tr.bank.holder')}
                    value={holderName}
                    onChange={(next) => {
                      setHolderName(next);
                      setErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                    placeholder={t('tr.bank.holderPlaceholder')}
                    icon={<UserIcon size={18} />}
                    error={errors.name}
                  />
                  <TextField
                    id={TR_IDS.account}
                    label={t('tr.bank.account')}
                    value={account}
                    onChange={(next) => {
                      setAccount(next);
                      setErrors((prev) => ({ ...prev, account: undefined }));
                    }}
                    placeholder={t('tr.bank.accountPlaceholder')}
                    inputMode="numeric"
                    icon={<CardIcon size={18} />}
                    error={errors.account}
                    hint={t('tr.bank.hint')}
                  />
                  <div className="cx-field">
                    <span className="cx-label">{t('tr.bank.bankName')}</span>
                    <select
                      id={TR_IDS.bank}
                      className="cx-input cx-input--plain cx-select"
                      value={bankId}
                      onChange={(event) => setBankId(event.target.value)}
                      aria-invalid={errors.bank ? true : undefined}
                      aria-describedby={errors.bank ? `${TR_IDS.bank}-error` : undefined}
                      style={{
                        minHeight: 54,
                        padding: '0 14px',
                        border: '1.5px solid var(--cx-border)',
                        borderRadius: 'var(--cx-r-md)',
                        background: '#fff',
                        boxShadow: 'var(--cx-shadow-card)',
                        width: '100%',
                      }}
                      aria-label={t('tr.bank.bankName')}
                    >
                      {BANKS.map((bank) => (
                        <option key={bank.id} value={bank.id}>
                          {bank[lang]}
                        </option>
                      ))}
                    </select>
                    {errors.bank ? (
                      <span className="cx-field__error" id={`${TR_IDS.bank}-error`}>
                        {errors.bank}
                      </span>
                    ) : null}
                  </div>
                </>
              ) : null}

              {destinationType === 'wallet' ? (
                <>
                  <h2 className="cx-label">
                    <span className="cx-dot" />
                    <span>{t('tr.wallet.label')}</span>
                  </h2>
                  <WalletSelector
                    id={TR_IDS.destWallet}
                    value={destWallet}
                    layout="row"
                    ariaLabel={t('tr.wallet.label')}
                    onChange={setDestWallet}
                  />
                  <TextField
                    id={TR_IDS.phone}
                    label={t('tr.wallet.phone')}
                    value={phone}
                    onChange={(next) => {
                      setPhone(next);
                      setErrors((prev) => ({ ...prev, phone: undefined }));
                    }}
                    variant="phone"
                    inputMode="tel"
                    maxLength={13}
                    transform={formatPhoneTyping}
                    icon={<PhoneLeadingIcon />}
                    trailing={<PhoneContactButton />}
                    hint={t('tr.wallet.hint')}
                    error={errors.phone}
                  />
                </>
              ) : null}

              <h2 className="cx-label">
                <span className="cx-dot" />
                <span>{t('tr.amount')}</span>
              </h2>
              <AmountInput
                id={TR_IDS.amount}
                value={amountText}
                onChange={(next) => {
                  setAmountText(next);
                  setErrors((prev) => ({ ...prev, amount: undefined }));
                }}
                invalid={Boolean(errors.amount)}
                describedBy={errors.amount ? TR_IDS.amountError : undefined}
                ariaLabel={t('tr.amount')}
              />
              <QuickAmountButtons
                amounts={QUICK_AMOUNTS}
                selected={amountMinor}
                ariaLabel={t('tr.quickAmounts')}
                onPick={(value) => {
                  setAmountText(String(value / 100));
                  setErrors((prev) => ({ ...prev, amount: undefined }));
                }}
              />
              {errors.amount ? (
                <InfoNotice id={TR_IDS.amountError}>{errors.amount}</InfoNotice>
              ) : null}

              <FeeSummary
                title={t('tr.summary')}
                divider
                amountLabel={t('tr.summary.recipient')}
                amountValue={formatMoney(fee.recipientAmount, lang)}
                feeLabel={t('tr.summary.fee')}
                feeValue={formatMoney(fee.fee, lang)}
                totalLabel={t('tr.summary.total')}
                totalValue={formatMoney(fee.total, lang)}
              />

              <SecurityNotice title={t('tr.security.title')} sub={t('tr.security.sub')} />

              <PrimaryActionButton label={t('tr.continue')} arrow onClick={goToConfirm} />

              <p className="cx-disclosure">
                <LockIcon size={14} />
                <span>{t('tr.encryption')}</span>
              </p>
            </>
          ) : null}

          {stage === 'confirm' ? (
            <>
              <div className="cx-confirmhead">
                <span className="cx-confirmhead__tile" aria-hidden="true">
                  <ShieldCheckIcon size={26} />
                </span>
                <div className="cx-confirmhead__titles">
                  <h2 className="cx-confirmhead__title">{t('tr.confirm.title')}</h2>
                </div>
              </div>

              <RoutePair
                layout="stack"
                from={{
                  logo: <BrandLogo id={sourceWallet} />,
                  caption: t('tr.from'),
                  name: walletName(sourceWallet),
                }}
                to={{
                  logo: <BrandLogo id={destinationLogo} />,
                  caption: t('tr.to'),
                  name: destinationLabel,
                }}
              />

              <section className="cx-card">
                <div className="cx-details">
                  <DetailRow
                    icon={<UserIcon size={17} />}
                    label={t('tr.confirm.recipientNumber')}
                    mono
                    value={recipientDisplay}
                  />
                  {holderName ? (
                    <DetailRow
                      icon={<UserIcon size={17} />}
                      label={t('tr.bank.holder')}
                      value={holderName}
                    />
                  ) : null}
                  <DetailRow
                    icon={<MoneyIcon size={17} />}
                    label={t('tr.confirm.receives')}
                    tone="green"
                    value={formatMoney(fee.recipientAmount, lang)}
                  />
                  <DetailRow
                    icon={<CardIcon size={17} />}
                    label={t('tr.confirm.total')}
                    tone="purple"
                    value={formatMoney(fee.total, lang)}
                  />
                  <DetailRow
                    icon={<PercentIcon size={17} />}
                    label={t('tr.confirm.fee')}
                    value={formatMoney(fee.fee, lang)}
                  />
                  <DetailRow
                    icon={<CardIcon size={17} />}
                    label={t('tr.confirm.fromWallet')}
                    value={
                      <>
                        <span>{walletName(sourceWallet)}</span>
                        <BrandLogo id={sourceWallet} size="xs" />
                      </>
                    }
                  />
                  <DetailRow
                    icon={<ZapIcon size={17} />}
                    label={t('tr.confirm.when')}
                    tone="green"
                    value={t('tr.confirm.instant')}
                  />
                </div>
              </section>

              <InfoNotice icon={<ShieldCheckIcon size={17} />}>{t('tr.confirm.notice')}</InfoNotice>

              <PrimaryActionButton
                label={t('tr.confirm.pay', { wallet: walletName(sourceWallet) })}
                sub={t('tr.confirm.paySub')}
                lock
                loading={submitting}
                onClick={runPayment}
              />

              <button
                type="button"
                className="cx-btn cx-btn--secondary cx-btn--block"
                onClick={() => setStage('form')}
                style={{ minHeight: 50 }}
              >
                <EditIcon size={18} />
                <span>{t('tr.confirm.edit')}</span>
              </button>

              <div className="cx-card cx-card--lilac" style={{ gap: 10 }}>
                <DemoFailureToggle
                  label={lang === 'ar' ? 'محاكاة فشل العملية (للتجربة)' : 'Simulate a failed transaction'}
                  checked={simulateFailure}
                  onChange={setSimulateFailure}
                />
                <p className="cx-disclosure" style={{ justifyContent: 'flex-start', textAlign: 'start' }}>
                  <CheckCircleIcon size={14} />
                  <span>{t('tr.confirm.legal')}</span>
                </p>
              </div>
            </>
          ) : null}

          {stage === 'processing' ? (
            <div className="cx-processing">
              <span className="cx-processing__ring">
                <span className="cx-spinner cx-spinner--dark" />
              </span>
              <span className="cx-processing__title">{t('tr.processing')}</span>
              <span className="cx-processing__sub">{t('tr.processingSub')}</span>
            </div>
          ) : null}

          {stage === 'failed' && transaction ? (
            <>
              <section className="cx-screenhead cx-screenhead--failed">
                <span className="cx-success__mark">
                  <span
                    className="cx-success__check"
                    style={{ background: 'linear-gradient(160deg,#e8624f,#c02a22)' }}
                  >
                    <ClockIcon size={30} />
                  </span>
                </span>
                <h2 className="cx-success__title">{t('tr.failed.title')}</h2>
                <p className="cx-success__sub">{t('tr.failed.sub')}</p>
              </section>

              <section className="cx-card">
                <div className="cx-details">
                  <DetailRow
                    icon={<ReceiptIcon size={17} />}
                    label={t('tx.id')}
                    mono
                    value={transaction.id}
                  />
                  <DetailRow
                    icon={<CardIcon size={17} />}
                    label={t('tx.status')}
                    tone="strong"
                    value={t('status.failed')}
                  />
                  <DetailRow
                    icon={<MoneyIcon size={17} />}
                    label={t('tr.confirm.total')}
                    value={formatMoney(transaction.totalAmount, lang)}
                  />
                </div>
              </section>

              <PrimaryActionButton
                label={t('tr.failed.retry')}
                onClick={() => {
                  setSimulateFailure(false);
                  void runPayment();
                }}
              />

              <button
                type="button"
                className="cx-btn cx-btn--secondary cx-btn--block"
                onClick={() => setStage('form')}
                style={{ minHeight: 50 }}
              >
                <EditIcon size={18} />
                <span>{t('tr.failed.edit')}</span>
              </button>
            </>
          ) : null}

          {stage === 'success' && transaction ? (
            <>
              <SuccessPanel
                title={t('tr.success.title')}
                sub={t('tr.success.sub', {
                  amount: formatMoney(transaction.recipientAmount, lang),
                })}
              />

              <section className="cx-card" style={{ gap: 0, padding: 0 }}>
                <div style={{ padding: '12px 14px' }}>
                  <RoutePair
                    plain
                    from={{
                      logo: <BrandLogo id={transaction.sourceWallet} />,
                      caption: t('tr.from'),
                      name: walletName(transaction.sourceWallet),
                    }}
                    to={{
                      logo: <BrandLogo id={destinationLogo} />,
                      caption: t('tr.to'),
                      name: destinationLabel,
                    }}
                  />
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    borderTop: '1px solid var(--cx-hairline)',
                  }}
                >
                  <div
                    style={{
                      padding: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      borderInlineEnd: '1px solid var(--cx-hairline)',
                    }}
                  >
                    <span className="cx-row__icon">
                      <UserIcon size={16} />
                    </span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                      <span className="cx-route__caption">{t('tx.recipient')}</span>
                      <span className="cx-row__val cx-row__val--mono" style={{ fontSize: 12.5 }}>
                        {transaction.recipient}
                      </span>
                    </span>
                  </div>
                  <div style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="cx-row__icon">
                      <MoneyIcon size={16} />
                    </span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                      <span className="cx-route__caption">{t('tr.success.amountReceived')}</span>
                      <span
                        className="cx-row__val cx-row__val--green"
                        style={{ fontSize: 12.5, fontWeight: 800 }}
                      >
                        {formatMoney(transaction.recipientAmount, lang)}
                      </span>
                    </span>
                  </div>
                </div>
              </section>

              <section className="cx-card">
                <div className="cx-details">
                  <DetailRow
                    icon={<MoneyIcon size={17} />}
                    label={t('tr.summary.recipient')}
                    value={formatMoney(transaction.recipientAmount, lang)}
                  />
                  <DetailRow
                    icon={<PercentIcon size={17} />}
                    label={t('tr.summary.fee')}
                    value={formatMoney(transaction.fee, lang)}
                  />
                  <DetailRow
                    icon={<CardIcon size={17} />}
                    label={t('tr.confirm.total')}
                    tone="purple"
                    value={formatMoney(transaction.totalAmount, lang)}
                  />
                  <DetailRow
                    icon={<ReceiptIcon size={17} />}
                    label={t('tx.id')}
                    mono
                    value={transaction.id}
                    action={<CopyButton value={transaction.id} label={t('tx.id')} />}
                  />
                  <DetailRow
                    icon={<CalendarIcon size={17} />}
                    label={t('tx.datetime')}
                    mono
                    value={formatDateTime(transaction.createdAt, lang)}
                  />
                  <DetailRow
                    icon={<CheckCircleIcon size={17} />}
                    label={t('tx.status')}
                    tone="green"
                    value={t('status.completed')}
                  />
                </div>
              </section>

              <ReceiptQrPanel value={transaction.id} />

              <InfoNotice tone="green" icon={<ShieldCheckIcon size={17} />}>
                {t('tr.success.info')}
                <span
                  style={{
                    display: 'block',
                    color: 'var(--cx-green-text)',
                    fontWeight: 800,
                    marginTop: 2,
                  }}
                >
                  {t('tr.success.infoSub')}
                </span>
              </InfoNotice>

              <div className="cx-actions">
                <button
                  type="button"
                  className="cx-btn cx-btn--secondary cx-btn--sm"
                  onClick={() => navigate({ name: 'home' })}
                  style={{ gap: 8, justifyContent: 'center', padding: '10px 12px' }}
                >
                  <HomeIcon size={18} />
                  {t('tr.success.goHome')}
                </button>
                <button
                  type="button"
                  className="cx-btn cx-btn--whatsapp cx-btn--sm"
                  onClick={onWhatsApp}
                  disabled={sharing}
                  style={{ gap: 8, justifyContent: 'center', padding: '10px 12px' }}
                >
                  {sharing ? (
                    <span className="cx-spinner" />
                  ) : (
                    <WhatsAppIcon size={18} />
                  )}
                  {t('whatsapp.action')}
                </button>
              </div>

              <button
                type="button"
                className="cx-btn cx-btn--secondary cx-btn--block"
                onClick={() => openReceiptExport(transaction.id)}
              >
                <DownloadIcon size={17} />
                {t('export.action')}
              </button>

              <RatingRow prompt={t('tr.rate')} value={rating} onChange={setRating} />

              <button
                type="button"
                className="cx-linkbtn"
                style={{ justifyContent: 'center' }}
                onClick={() => navigate({ name: 'txDetail', id: transaction.id })}
              >
                <ReceiptIcon size={16} />
                {t('tx.receipt')}
              </button>
            </>
          ) : null}
        </StepTransition>
      </div>

      <BottomNavigation active="transfer" />
    </>
  );
}

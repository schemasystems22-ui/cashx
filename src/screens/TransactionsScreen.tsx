import { formatDateTime, formatMoney, formatPhone, walletName } from '../lib/format';
import { buildReceiptText, shareReceipt } from '../lib/share';
import type { Transaction } from '../lib/types';
import { useApp } from '../state/store';
import { BrandLogo, type BrandId } from '../components/BrandLogo';
import { BottomNavigation, CashXHeader } from '../components/Chrome';
import { CopyButton } from '../components/CopyButton';
import { DetailRow, InfoNotice, RoutePair } from '../components/Form';
import {
  CalendarIcon,
  CardIcon,
  CheckCircleIcon,
  ClockIcon,
  HomeIcon,
  MoneyIcon,
  PercentIcon,
  ReceiptIcon,
  ShareIcon,
  UserIcon,
} from '../components/icons';

/* ------------------------------------------------------------------ */
/* List                                                               */
/* ------------------------------------------------------------------ */

export function TransactionList({
  transactions,
  emptyLabel,
  onOpen,
}: {
  transactions: Transaction[];
  emptyLabel: string;
  onOpen: (id: string) => void;
}) {
  const { t, lang } = useApp();

  if (transactions.length === 0) {
    return (
      <div className="cx-empty cx-card">
        <ClockIcon size={26} />
        <span>{emptyLabel}</span>
        <span className="cx-field__hint">{t('tx.emptySub')}</span>
      </div>
    );
  }

  return (
    <ul className="cx-txlist">
      {transactions.map((tx) => {
        const isTopUp = tx.flowType === 'add_balance';
        const title = isTopUp ? t('tx.typeAddBalance') : t('tx.typeTransfer');
        const subtitle =
          tx.destinationType === 'cashx_balance'
            ? walletName(tx.sourceWallet)
            : tx.destinationType === 'wallet' && tx.destinationWallet
              ? walletName(tx.destinationWallet)
              : tx.destinationType === 'instapay'
                ? t('tr.dest.instapay')
                : t('tr.dest.bank');

        return (
          <li key={tx.id}>
            <button type="button" className="cx-tx" onClick={() => onOpen(tx.id)}>
              <BrandLogo id={(isTopUp ? tx.sourceWallet : tx.destinationWallet ?? (tx.destinationType === 'bank' ? 'bank' : 'instapay')) as BrandId} size="sm" />
              <span className="cx-tx__main">
                <span className="cx-tx__title">
                  {title} · {subtitle}
                </span>
                <span className="cx-tx__sub">{tx.id}</span>
                <span className="cx-tx__sub">{formatDateTime(tx.createdAt, lang)}</span>
              </span>
              <span className="cx-tx__side">
                <span
                  className={['cx-tx__amount', isTopUp ? 'cx-tx__amount--in' : 'cx-tx__amount--out'].join(' ')}
                >
                  {isTopUp ? '+' : ''}
                  {formatMoney(isTopUp ? tx.recipientAmount : tx.totalAmount, lang)}
                </span>
                <span className={`cx-status cx-status--${tx.status}`}>{t(statusKey(tx.status))}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function statusKey(status: Transaction['status']) {
  switch (status) {
    case 'completed':
      return 'status.completed';
    case 'processing':
      return 'status.processing';
    case 'failed':
      return 'status.failed';
    case 'cancelled':
      return 'status.cancelled';
    case 'awaiting_confirmation':
      return 'status.awaiting_confirmation';
    default:
      return 'status.draft';
  }
}

export function TransactionsScreen({
  onOpenNav,
  onOpenNotifications,
}: {
  onOpenNav: () => void;
  onOpenNotifications: () => void;
}) {
  const { t, transactions, navigate, lang } = useApp();

  const totals = transactions.reduce(
    (acc, tx) => {
      if (tx.status !== 'completed') return acc;
      if (tx.flowType === 'add_balance') acc.added += tx.recipientAmount;
      else acc.sent += tx.totalAmount;
      return acc;
    },
    { added: 0, sent: 0 },
  );

  return (
    <>
      <CashXHeader
        title={t('tx.title')}
        subtitle={t('tx.demoNote')}
        walletTile={false}
        onLeading={onOpenNav}
        onTrailing={onOpenNotifications}
        onBack={() => navigate({ name: 'home' })}
      />

      <div className="cx-body" role="main">
        <div className="cx-body__inner">
          <section className="cx-card cx-card--lilac" style={{ gap: 10 }}>
            <div className="cx-row-between">
              <span className="cx-sublabel">{t('tx.typeAddBalance')}</span>
              <span className="cx-row__val cx-row__val--green">
                {formatMoney(totals.added, lang)}
              </span>
            </div>
            <div className="cx-row-between">
              <span className="cx-sublabel">{t('tx.typeTransfer')}</span>
              <span className="cx-row__val">{formatMoney(totals.sent, lang)}</span>
            </div>
          </section>

          <TransactionList
            transactions={transactions}
            emptyLabel={t('tx.empty')}
            onOpen={(id) => navigate({ name: 'txDetail', id })}
          />
        </div>
      </div>

      <BottomNavigation active="transactions" />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Detail                                                             */
/* ------------------------------------------------------------------ */

export function TransactionDetailScreen({ id }: { id: string }) {
  const { t, lang, findTransaction, navigate, showToast } = useApp();
  const tx = findTransaction(id);

  if (!tx) {
    return (
      <>
        <CashXHeader
          leading="back"
          title={t('tx.details')}
          onLeading={() => navigate({ name: 'transactions' })}
        />
        <div className="cx-body" role="main">
          <div className="cx-body__inner">
            <div className="cx-empty">
              <ReceiptIcon size={26} />
              <span>{t('tx.notFound')}</span>
            </div>
          </div>
        </div>
        <BottomNavigation active="transactions" />
      </>
    );
  }

  const isTopUp = tx.flowType === 'add_balance';
  const destinationName =
    tx.destinationType === 'cashx_balance'
      ? 'CashX'
      : tx.destinationType === 'wallet' && tx.destinationWallet
        ? walletName(tx.destinationWallet)
        : tx.destinationType === 'instapay'
          ? t('tr.dest.instapay')
          : tx.destinationType === 'bank'
            ? t('tr.dest.bank')
            : t('tr.dest.wallet');

  const destinationLogo: BrandId =
    tx.destinationType === 'cashx_balance'
      ? 'cashx'
      : tx.destinationType === 'wallet' && tx.destinationWallet
        ? tx.destinationWallet
        : tx.destinationType === 'bank'
          ? 'bank'
          : 'instapay';

  const onShare = async () => {
    const text = buildReceiptText(
      [
        `${t('tx.id')}: ${tx.id}`,
        `${t('tr.from')}: ${walletName(tx.sourceWallet)}`,
        `${t('tr.to')}: ${destinationName}`,
        `${t('tx.recipient')}: ${tx.recipient}`,
        `${t('tx.amount')}: ${formatMoney(tx.recipientAmount, lang)}`,
        `${t('tx.fee')}: ${formatMoney(tx.fee, lang)}`,
        `${t('tx.total')}: ${formatMoney(tx.totalAmount, lang)}`,
      ],
      lang,
    );
    const outcome = await shareReceipt(text, `CashX · ${t('tx.receipt')}`);
    if (outcome.status === 'copied') showToast(t('common.copied'));
  };

  return (
    <>
      <CashXHeader
        leading="back"
        title={t('tx.details')}
        subtitle={formatDateTime(tx.createdAt, lang)}
        onLeading={() => navigate({ name: 'transactions' })}
      />

      <div className="cx-body" role="main">
        <div className="cx-body__inner">
          <section className="cx-screenhead">
            <span className={`cx-status cx-status--${tx.status}`}>{t(statusKey(tx.status))}</span>
            <h2 className="cx-success__title">
              {isTopUp ? t('tx.typeAddBalance') : t('tx.typeTransfer')}
            </h2>
            <span className="cx-success__amount" style={{ fontSize: 26, fontWeight: 800 }}>
              {formatMoney(tx.recipientAmount, lang)}
            </span>
          </section>

          <RoutePair
            layout="stack"
            from={{
              logo: <BrandLogo id={tx.sourceWallet} />,
              caption: t('tr.from'),
              name: walletName(tx.sourceWallet),
            }}
            to={{
              logo: <BrandLogo id={destinationLogo} />,
              caption: t('tr.to'),
              name: destinationName,
            }}
          />

          <section className="cx-card">
            <div className="cx-details">
              <DetailRow
                icon={<UserIcon size={17} />}
                label={t('tx.recipient')}
                mono
                value={tx.destinationType === 'bank' ? tx.recipient : formatPhone(tx.recipient)}
              />
              {tx.recipientName ? (
                <DetailRow
                  icon={<UserIcon size={17} />}
                  label={t('tr.bank.holder')}
                  value={tx.recipientName}
                />
              ) : null}
              <DetailRow
                icon={<MoneyIcon size={17} />}
                label={t('tx.amount')}
                value={formatMoney(tx.recipientAmount, lang)}
              />
              <DetailRow
                icon={<PercentIcon size={17} />}
                label={t('tx.fee')}
                value={formatMoney(tx.fee, lang)}
              />
              <DetailRow
                icon={<CardIcon size={17} />}
                label={t('tx.total')}
                tone="purple"
                value={formatMoney(tx.totalAmount, lang)}
              />
              <DetailRow
                icon={<ReceiptIcon size={17} />}
                label={t('tx.id')}
                mono
                value={tx.id}
                action={<CopyButton value={tx.id} label={t('tx.id')} />}
              />
              <DetailRow
                icon={<CalendarIcon size={17} />}
                label={t('tx.datetime')}
                mono
                value={formatDateTime(tx.createdAt, lang)}
              />
              <DetailRow
                icon={<CheckCircleIcon size={17} />}
                label={t('tx.status')}
                tone={tx.status === 'completed' ? 'green' : 'default'}
                value={t(statusKey(tx.status))}
              />
              {tx.bankName ? (
                <DetailRow icon={<CardIcon size={17} />} label={t('tr.bank.bankName')} value={tx.bankName} />
              ) : null}
            </div>
          </section>

          <InfoNotice>{t('tx.demoNote')}</InfoNotice>

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
              onClick={onShare}
              style={{ gap: 8, justifyContent: 'center', padding: '10px 12px' }}
            >
              <ShareIcon size={17} />
              {t('tx.shareReceipt')}
            </button>
          </div>
        </div>
      </div>

      <BottomNavigation active="transactions" />
    </>
  );
}

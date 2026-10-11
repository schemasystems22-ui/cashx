import { DEMO_USER } from '../lib/config';
import { formatNumber } from '../lib/format';
import { useApp } from '../state/store';
import { BrandLogo } from '../components/BrandLogo';
import { BottomNavigation, CashXHeader, LanguageSwitcher } from '../components/Chrome';
import { useCountUpState } from '../components/motion';
import { DetailRow, InfoNotice } from '../components/Form';
import { ArrowForwardIcon, InfoIcon, PlusIcon, ZapIcon } from '../components/icons';
import { TransactionList } from './TransactionsScreen';

const PLUS_ICON = <PlusIcon size={17} />;

export function HomeScreen({
  onOpenNav,
  onOpenNotifications,
}: {
  onOpenNav: () => void;
  onOpenNotifications: () => void;
}) {
  const { t, lang, balance, transactions, navigate } = useApp();
  // The headline balance counts up on load and after a simulated top-up.
  const { value: countedBalance, counting: balanceCounting } = useCountUpState(balance, {
    duration: 820,
  });

  return (
    <>
      <CashXHeader onLeading={onOpenNav} onTrailing={onOpenNotifications} />

      <div className="cx-body" role="main">
        {/* The Home header shows the brand rather than a title, so the screen
            needs its own h1 for the heading outline. */}
        <h1 className="cx-visually-hidden">{t('nav.home')}</h1>
        <div className="cx-body__inner">
          <section className="cx-hero">
            <span className="cx-hero__glow" aria-hidden="true" />
            <div className="cx-hero__brand">
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span className="cx-hero__label">{t('home.balance')}</span>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span
                    className={['cx-hero__amount', balanceCounting ? 'cx-counting' : '']
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {formatNumber(countedBalance, lang)}
                  </span>
                  <span className="cx-hero__currency">{t('common.egp')}</span>
                </span>
              </span>
              <BrandLogo id="cashx" size="lg" />
            </div>

            <span
              className="cx-demobadge"
              style={{ background: 'rgba(255,255,255,0.14)', color: '#fff' }}
            >
              {t('common.demo')}
            </span>

            <div className="cx-hero__actions">
              <button
                type="button"
                className="cx-hero__action cx-hero__action--primary"
                onClick={() => navigate({ name: 'transfer', step: 1 })}
              >
                <ZapIcon size={17} />
                {t('home.quickTransfer')}
              </button>
              <button
                type="button"
                className="cx-hero__action"
                onClick={() => navigate({ name: 'addBalance', step: 1 })}
              >
                {PLUS_ICON}
                {t('home.addBalance')}
              </button>
            </div>
          </section>

          <InfoNotice icon={<InfoIcon size={16} />}>{t('home.demoNote')}</InfoNotice>

          <div className="cx-row-between">
            <h2 className="cx-label">{t('home.recent')}</h2>
            <button
              type="button"
              className="cx-linkbtn"
              onClick={() => navigate({ name: 'transactions' })}
            >
              {t('home.viewAll')}
              <ArrowForwardIcon size={15} className="cx-flip" />
            </button>
          </div>

          <TransactionList
            transactions={transactions.slice(0, 3)}
            emptyLabel={t('home.empty')}
            onOpen={(id) => navigate({ name: 'txDetail', id })}
          />

          <section className="cx-card cx-card--lilac" style={{ gap: 6 }}>
            <div className="cx-row-between">
              <span className="cx-card__title">{DEMO_USER[lang === 'ar' ? 'nameAr' : 'nameEn']}</span>
              <span className="cx-field__hint" style={{ fontFamily: 'var(--cx-font-en)' }}>
                {DEMO_USER.phone}
              </span>
            </div>
            <DetailRow
              icon={<InfoIcon size={16} />}
              label={t('acct.demoMode')}
              value={t('acct.demoModeOn')}
              tone="purple"
            />
            <div className="cx-row-between">
              <span className="cx-setting__label">{t('lang.label')}</span>
              <LanguageSwitcher compact />
            </div>
          </section>
        </div>
      </div>

      <BottomNavigation active="home" />
    </>
  );
}

import { DEMO_USER } from '../lib/config';
import { formatNumber, formatPhone, walletName } from '../lib/format';
import { useApp } from '../state/store';
import { BrandLogo } from '../components/BrandLogo';
import { BottomNavigation, CashXHeader, LanguageSwitcher } from '../components/Chrome';
import { CashXMark } from '../components/CashXLogo';
import { DetailRow, InfoNotice } from '../components/Form';
import {
  CardIcon,
  HelpIcon,
  InfoIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  SmileIcon,
  UserIcon,
} from '../components/icons';

export function AccountScreen({
  onOpenNav,
  onOpenNotifications,
  onOpenHelp,
}: {
  onOpenNav: () => void;
  onOpenNotifications: () => void;
  onOpenHelp: () => void;
}) {
  const { t, lang, balance, resetDemo, showToast, navigate, transactions } = useApp();

  return (
    <>
      <CashXHeader
        title={t('acct.title')}
        subtitle={t('acct.demoMode')}
        onLeading={onOpenNav}
        onTrailing={onOpenNotifications}
        onBack={() => navigate({ name: 'home' })}
      />

      <div className="cx-body" role="main">
        <div className="cx-body__inner">
          <section className="cx-profile">
            <span className="cx-profile__avatar">{lang === 'ar' ? 'م' : 'D'}</span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className="cx-profile__name">{DEMO_USER[lang === 'ar' ? 'nameAr' : 'nameEn']}</span>
              <span className="cx-profile__meta">{formatPhone(DEMO_USER.phone)}</span>
            </span>
            <span style={{ marginInlineStart: 'auto' }}>
              <CashXMark size={30} />
            </span>
          </section>

          <section className="cx-card">
            <div className="cx-row-between">
              <span className="cx-setting__label">{t('lang.label')}</span>
              <LanguageSwitcher compact />
            </div>
            <div className="cx-row-between">
              <span className="cx-setting__label">{t('acct.wallet')}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BrandLogo id="vodafone" size="xs" />
                <span className="cx-setting__value">{walletName('vodafone')}</span>
              </span>
            </div>
            <div className="cx-row-between">
              <span className="cx-setting__label">{t('acct.notifications')}</span>
              <span className="cx-setting__value">{t('acct.demoModeOn')}</span>
            </div>
          </section>

          <section className="cx-card">
            <DetailRow
              icon={<CardIcon size={17} />}
              label={t('acct.balance')}
              tone="purple"
              value={`${formatNumber(balance, lang)} ${t('common.egp')}`}
            />
            <DetailRow
              icon={<ReceiptIcon size={17} />}
              label={t('tx.title')}
              value={String(transactions.length)}
            />
            <DetailRow
              icon={<UserIcon size={17} />}
              label={t('acct.demoMode')}
              tone="green"
              value={t('acct.demoModeOn')}
            />
          </section>

          <InfoNotice icon={<ShieldCheckIcon size={17} />}>{t('acct.disclosure')}</InfoNotice>

          <section className="cx-card">
            <button type="button" className="cx-setting" onClick={onOpenHelp}>
              <span className="cx-row__icon">
                <HelpIcon size={18} />
              </span>
              <span className="cx-setting__label">{t('acct.help')}</span>
              <span style={{ color: 'var(--cx-text-3)' }}>
                <HelpIcon size={16} />
              </span>
            </button>
            <button
              type="button"
              className="cx-setting"
              onClick={() => {
                resetDemo();
                showToast(t('acct.resetDone'));
              }}
            >
              <span className="cx-row__icon">
                <SmileIcon size={18} />
              </span>
              <span className="cx-setting__label">{t('acct.reset')}</span>
              <span className="cx-setting__value">{t('acct.version')} 1.0.0</span>
            </button>
            <p className="cx-field__hint">{t('acct.resetHint')}</p>
          </section>

          <p className="cx-disclosure">
            <InfoIcon size={14} />
            <span>{t('app.name')} · {t('common.demo')}</span>
          </p>
        </div>
      </div>

      <BottomNavigation active="account" />
    </>
  );
}

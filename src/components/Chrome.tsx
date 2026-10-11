import { useId, useRef, type ReactNode } from 'react';
import { useDialogFocus } from '../lib/a11y';
import { useApp, type Route } from '../state/store';
import { CashXWordmark, CashXMark } from './CashXLogo';
import {
  ArrowBackIcon,
  ArrowForwardIcon,
  BellIcon,
  CheckIcon,
  ClockIcon,
  CloseIcon,
  HelpIcon,
  HomeIcon,
  InfoIcon,
  MenuIcon,
  UserIcon,
  WalletPlusIcon,
} from './icons';

/* ------------------------------------------------------------------ */
/* Step progress                                                       */
/* ------------------------------------------------------------------ */

export type StepState = 'done' | 'active' | 'todo';

export interface StepItem {
  label: string;
  state: StepState;
}

/** The word a screen reader appends after each step label. */
const STEP_STATE_KEY = {
  done: 'a11y.stepDone',
  active: 'a11y.stepCurrent',
  todo: 'a11y.stepUpcoming',
} as const;

export function StepProgress({ steps }: { steps: StepItem[] }) {
  const { t } = useApp();
  const count = steps.length;
  const activeIndex = Math.max(
    steps.findIndex((step) => step.state === 'active'),
    0,
  );
  // The reference colours the rail up to the step after the active one.
  const progress = count > 1 ? Math.min(1, (activeIndex + 1) / (count - 1)) : 1;

  return (
    <div className="cx-stepper" style={{ ['--cx-steps' as string]: count }}>
      {/* The dots are a visual echo of the labels underneath, so they are hidden
          from assistive technology: the ordered list below carries the meaning
          (including which step is current). */}
      <div className="cx-stepper__rail" aria-hidden="true">
        <span className="cx-stepper__track" />
        <span
          className="cx-stepper__track cx-stepper__track--progress"
          style={{ width: `calc((100% - 100% / ${count}) * ${progress})` }}
        />
        {steps.map((step, index) => (
          <div className="cx-stepper__item" key={step.label}>
            <span
              className={[
                'cx-stepper__dot',
                step.state === 'active' ? 'cx-stepper__dot--active' : '',
                step.state === 'done' ? 'cx-stepper__dot--done' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {step.state === 'done' ? <CheckIcon size={13} /> : index + 1}
            </span>
          </div>
        ))}
      </div>
      <ol className="cx-stepper__labels" aria-label={t('a11y.progress')}>
        {steps.map((step, index) => (
          <li
            key={step.label}
            className={[
              'cx-stepper__label',
              step.state === 'active' ? 'cx-stepper__label--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-current={step.state === 'active' ? 'step' : undefined}
          >
            <span className="cx-visually-hidden">{`${index + 1}. `}</span>
            {step.label}
            <span className="cx-visually-hidden">
              {` — ${t(STEP_STATE_KEY[step.state])}`}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Header                                                             */
/* ------------------------------------------------------------------ */

interface CashXHeaderProps {
  leading?: 'menu' | 'back' | 'none';
  trailing?: 'bell' | 'help' | 'none';
  notifications?: number;
  title?: string;
  subtitle?: string;
  walletTile?: boolean;
  steps?: StepItem[];
  onLeading?: () => void;
  onTrailing?: () => void;
  onBack?: () => void;
}

export function CashXHeader({
  leading = 'menu',
  trailing = 'bell',
  notifications = 3,
  title,
  subtitle,
  walletTile = false,
  steps,
  onLeading,
  onTrailing,
  onBack,
}: CashXHeaderProps) {
  const { t } = useApp();

  return (
    <header className="cx-header">
      <div className="cx-header__top">
        {leading === 'menu' ? (
          <button
            type="button"
            className="cx-iconbtn"
            onClick={onLeading}
            aria-label={t('a11y.menu')}
          >
            <MenuIcon size={22} />
          </button>
        ) : leading === 'back' ? (
          <button type="button" className="cx-iconbtn" onClick={onLeading} aria-label={t('common.back')}>
            <ArrowBackIcon size={22} />
          </button>
        ) : (
          <span />
        )}

        <div className="cx-header__brand">
          <CashXWordmark />
          <span className="cx-header__tagline">{t('app.tagline')}</span>
        </div>

        {trailing === 'bell' ? (
          <button
            type="button"
            className="cx-iconbtn"
            onClick={onTrailing}
            aria-label={t('a11y.notifications', { count: notifications })}
          >
            <BellIcon size={22} />
            {notifications > 0 ? (
              <span className="cx-badge" aria-hidden="true">
                {notifications}
              </span>
            ) : null}
          </button>
        ) : trailing === 'help' ? (
          <button
            type="button"
            className="cx-chipbtn cx-chipbtn--icon"
            onClick={onTrailing}
            aria-label={t('common.help')}
          >
            <HelpIcon size={18} />
            <span className="cx-chipbtn__caption">{t('common.help')}</span>
          </button>
        ) : (
          <span />
        )}
      </div>

      {title ? (
        <div className="cx-subheader">
          {walletTile ? (
            <span className="cx-tilebtn" aria-hidden="true">
              <WalletPlusIcon size={24} />
            </span>
          ) : null}
          <div className="cx-subheader__titles">
            <h1 className="cx-subheader__title">{title}</h1>
            {subtitle ? <p className="cx-subheader__sub">{subtitle}</p> : null}
          </div>
          {onBack ? (
            <button type="button" className="cx-chipbtn" onClick={onBack}>
              <ArrowBackIcon size={16} />
              <span>{t('common.back')}</span>
            </button>
          ) : null}
        </div>
      ) : null}

      {steps ? (
        <div style={{ marginTop: title ? 14 : 18, paddingBottom: 4 }}>
          <StepProgress steps={steps} />
        </div>
      ) : null}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Bottom navigation                                                  */
/* ------------------------------------------------------------------ */

export type NavKey = 'home' | 'transfer' | 'transactions' | 'account';

/** Tabs always enter a flow at step 1, so a fresh visit never opens mid-flow. */
function routeForTab(key: NavKey): Route {
  switch (key) {
    case 'transfer':
      return { name: 'transfer', step: 1 };
    case 'transactions':
      return { name: 'transactions' };
    case 'account':
      return { name: 'account' };
    default:
      return { name: 'home' };
  }
}

export function BottomNavigation({ active }: { active: NavKey }) {
  const { t, navigate } = useApp();

  const items: { key: NavKey; label: string; icon: ReactNode }[] = [
    { key: 'home', label: t('nav.home'), icon: <HomeIcon size={21} /> },
    {
      key: 'transfer',
      label: t('nav.transfer'),
      icon: (
        <span className="cx-nav__brand">
          <CashXMark size={21} tone={active === 'transfer' ? 'brand' : 'mono'} />
        </span>
      ),
    },
    { key: 'transactions', label: t('nav.transactions'), icon: <ClockIcon size={21} /> },
    { key: 'account', label: t('nav.account'), icon: <UserIcon size={21} /> },
  ];

  return (
    <nav className="cx-nav">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={['cx-nav__item', active === item.key ? 'cx-nav__item--active' : '']
            .filter(Boolean)
            .join(' ')}
          onClick={() => navigate(routeForTab(item.key))}
          aria-current={active === item.key ? 'page' : undefined}
        >
          <span className="cx-nav__pill">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Language switcher                                                  */
/* ------------------------------------------------------------------ */

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useApp();

  return (
    <div
      className={['cx-lang', compact ? 'cx-lang--compact' : ''].filter(Boolean).join(' ')}
      role="group"
      aria-label={t('lang.label')}
    >
      <button
        type="button"
        className={['cx-lang__btn', lang === 'ar' ? 'cx-lang__btn--active' : '']
          .filter(Boolean)
          .join(' ')}
        onClick={() => setLang('ar')}
        lang="ar"
      >
        {t('lang.ar')}
      </button>
      <button
        type="button"
        className={['cx-lang__btn', lang === 'en' ? 'cx-lang__btn--active' : '']
          .filter(Boolean)
          .join(' ')}
        onClick={() => setLang('en')}
        lang="en"
      >
        {t('lang.en')}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sheets                                                             */
/* ------------------------------------------------------------------ */

export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useApp();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // Trap Tab inside the panel, close on Escape and hand focus back on close.
  useDialogFocus(panelRef, onClose);

  return (
    <div className="cx-sheet-backdrop" onClick={onClose}>
      <div
        className="cx-sheet"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="cx-sheet__head">
          <span className="cx-sheet__title" id={titleId}>
            {title}
          </span>
          <button
            type="button"
            className="cx-iconbtn"
            onClick={onClose}
            aria-label={t('a11y.close')}
            style={{ width: 38, height: 38, borderColor: 'var(--cx-border)', background: 'var(--cx-lilac)', color: 'var(--cx-purple)' }}
          >
            <CloseIcon size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function HelpSheet() {
  const { helpOpen, setHelpOpen, t } = useApp();
  if (!helpOpen) return null;

  return (
    <Sheet title={t('help.title')} onClose={() => setHelpOpen(false)}>
      <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--cx-text-2)', fontWeight: 600 }}>
        {t('help.body')}
      </p>
      <div className="cx-card cx-card--lilac" style={{ gap: 10 }}>
        <span className="cx-label">{t('acct.demoMode')}</span>
        <span className="cx-demobadge">{t('common.demo')}</span>
        <p style={{ fontSize: 12.5, lineHeight: 1.7, color: '#4c4866', fontWeight: 600 }}>
          {t('acct.disclosure')}
        </p>
      </div>
      <div className="cx-row-between">
        <span className="cx-setting__label">{t('lang.label')}</span>
        <LanguageSwitcher compact />
      </div>
      <button type="button" className="cx-btn cx-btn--secondary cx-btn--block" onClick={() => setHelpOpen(false)}>
        {t('common.close')}
      </button>
    </Sheet>
  );
}

export function NavSheet({ onClose }: { onClose: () => void }) {
  const { t, navigate } = useApp();
  const links: { key: NavKey; label: string }[] = [
    { key: 'home', label: t('nav.home') },
    { key: 'transfer', label: t('nav.transfer') },
    { key: 'transactions', label: t('nav.transactions') },
    { key: 'account', label: t('nav.account') },
  ];

  return (
    <Sheet title={t('app.name')} onClose={onClose}>
      <div>
        {links.map((link) => (
          <button
            key={link.key}
            type="button"
            className="cx-setting"
            onClick={() => {
              navigate(routeForTab(link.key));
              onClose();
            }}
          >
            <span className="cx-row__icon">
              {link.key === 'home' ? (
                <HomeIcon size={18} />
              ) : link.key === 'transactions' ? (
                <ClockIcon size={18} />
              ) : link.key === 'account' ? (
                <UserIcon size={18} />
              ) : (
                <CashXMark size={18} tone="mono" />
              )}
            </span>
            <span className="cx-setting__label">{link.label}</span>
            <span className="cx-flip" style={{ color: 'var(--cx-text-3)' }}>
              <ArrowForwardIcon size={16} />
            </span>
          </button>
        ))}
      </div>
      <div className="cx-row-between">
        <span className="cx-setting__label">{t('lang.label')}</span>
        <LanguageSwitcher compact />
      </div>
    </Sheet>
  );
}

export function NotificationsSheet({ onClose }: { onClose: () => void }) {
  const { t, lang } = useApp();
  const items =
    lang === 'ar'
      ? [
          { title: 'مرحبًا بك في CashX', body: 'هذه إشعارات تجريبية فقط ولا تعكس أي عملية حقيقية.', time: '9:41' },
          { title: 'إضافة رصيد تجريبية', body: 'تمت محاكاة إضافة رصيد بنجاح داخل التطبيق.', time: '9:12' },
          { title: 'تذكير', body: 'أكمل بيانات المستفيد للتحويل التجريبي التالي.', time: 'أمس' },
        ]
      : [
          { title: 'Welcome to CashX', body: 'These are demo notifications only and reflect no real activity.', time: '9:41' },
          { title: 'Demo top-up', body: 'A balance top-up was simulated inside the app.', time: '9:12' },
          { title: 'Reminder', body: 'Finish the recipient details for your next demo transfer.', time: 'Yesterday' },
        ];

  return (
    <Sheet title={t('acct.notifications')} onClose={onClose}>
      <div className="cx-notice cx-notice--lilac">
        <span className="cx-notice__icon">
          <InfoIcon size={16} />
        </span>
        <span className="cx-notice__text">{t('tx.demoNote')}</span>
      </div>
      <div className="cx-stack" style={{ gap: 10 }}>
        {items.map((item) => (
          <div className="cx-card" key={item.title} style={{ gap: 4 }}>
            <div className="cx-row-between">
              <span className="cx-card__title">{item.title}</span>
              <span className="cx-field__hint">{item.time}</span>
            </div>
            <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--cx-text-2)' }}>{item.body}</p>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Toast                                                              */
/* ------------------------------------------------------------------ */

export function ToastHost() {
  const { toast } = useApp();
  if (!toast) return null;
  return (
    <div className="cx-toast" role="status">
      <CheckIcon size={14} />
      <span>{toast}</span>
    </div>
  );
}

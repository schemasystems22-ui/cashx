import type { ChangeEvent, ReactNode } from 'react';
import { useRovingRadioGroup } from '../lib/a11y';
import { useCountUpState } from './motion';
import { WALLETS } from '../lib/config';
import {
  formatCompactAmount,
  formatNumber,
  groupAmountInput,
  normalizeDigits,
  parseAmountInput,
} from '../lib/format';
import type { DestinationType, Lang, WalletId } from '../lib/types';
import { useApp } from '../state/store';
import { BrandLogo } from './BrandLogo';
import { CashXMark } from './CashXLogo';
import {
  ArrowForwardIcon,
  BankIcon,
  CheckIcon,
  CheckCircleIcon,
  ContactsIcon,
  InfoIcon,
  LockIcon,
  MoneyIcon,
  PhoneIcon,
  ShieldCheckIcon,
  SparkleIcon,
  StarIcon,
  WalletIcon,
} from './icons';

/* ------------------------------------------------------------------ */
/* Wallet selector                                                    */
/* ------------------------------------------------------------------ */

interface WalletSelectorProps {
  value: WalletId | null;
  onChange: (wallet: WalletId) => void;
  layout: 'grid' | 'row';
  ariaLabel: string;
  /** Lets a validation message point back at the whole group. */
  id?: string;
  describedBy?: string;
}

export function WalletSelector({
  value,
  onChange,
  layout,
  ariaLabel,
  id,
  describedBy,
}: WalletSelectorProps) {
  const { dir } = useApp();
  const selectedIndex = WALLETS.findIndex((wallet) => wallet.id === value);
  // One Tab stop for the group; arrows move and select (see useRovingRadioGroup).
  const { register, onKeyDown, tabIndexFor } = useRovingRadioGroup({
    count: WALLETS.length,
    selectedIndex,
    onSelectIndex: (index) => onChange(WALLETS[index].id),
    direction: dir,
  });

  return (
    <div
      id={id}
      className={['cx-wallets', layout === 'grid' ? 'cx-wallets--grid' : 'cx-wallets--row']
        .filter(Boolean)
        .join(' ')}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-describedby={describedBy}
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      {WALLETS.map((wallet, index) => (
        <WalletCard
          key={wallet.id}
          cardRef={register(index)}
          tabIndex={tabIndexFor(index)}
          wallet={wallet.id}
          name={wallet.name}
          selected={value === wallet.id}
          onSelect={() => onChange(wallet.id)}
          layout={layout}
        />
      ))}
    </div>
  );
}

interface WalletCardProps {
  wallet: WalletId;
  name: string;
  selected: boolean;
  onSelect: () => void;
  layout: 'grid' | 'row';
  /** Roving-tabindex wiring, supplied by the enclosing selector. */
  cardRef?: (node: HTMLButtonElement | null) => void;
  tabIndex?: 0 | -1;
}

export function WalletCard({
  wallet,
  name,
  selected,
  onSelect,
  layout,
  cardRef,
  tabIndex,
}: WalletCardProps) {
  return (
    <button
      type="button"
      ref={cardRef}
      role="radio"
      aria-checked={selected}
      tabIndex={tabIndex}
      className={['cx-wallet', selected ? 'cx-wallet--selected' : ''].filter(Boolean).join(' ')}
      onClick={onSelect}
    >
      <BrandLogo id={wallet} size={layout === 'grid' ? 'lg' : 'md'} />
      <span className="cx-wallet__name">{name}</span>
      {selected ? (
        <span className="cx-wallet__check" aria-hidden="true">
          <CheckIcon size={12} />
        </span>
      ) : null}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Destination selector                                               */
/* ------------------------------------------------------------------ */

/**
 * The destination picker is a three-way choice, not a set of tab panels, so it
 * is exposed as a radiogroup: `role="tab"` would promise Tab-key navigation
 * between panels that do not exist.
 */
export function DestinationSelector({
  value,
  onChange,
  ariaLabel,
}: {
  value: DestinationType;
  onChange: (next: DestinationType) => void;
  ariaLabel?: string;
}) {
  const { t, lang, dir } = useApp();

  const options: { id: DestinationType; label: string; icon: (active: boolean) => ReactNode }[] = [
    {
      id: 'instapay',
      label: t('tr.dest.instapay'),
      icon: () => <BrandLogo id="instapay" size="xs" />,
    },
    { id: 'bank', label: t('tr.dest.bank'), icon: () => <BankIcon size={19} /> },
    { id: 'wallet', label: t('tr.dest.wallet'), icon: () => <WalletIcon size={19} /> },
  ];

  const selectedIndex = options.findIndex((option) => option.id === value);
  const { register, onKeyDown, tabIndexFor } = useRovingRadioGroup({
    count: options.length,
    selectedIndex,
    onSelectIndex: (index) => onChange(options[index].id),
    direction: dir,
  });

  return (
    <div
      className="cx-segment"
      role="radiogroup"
      aria-label={ariaLabel ?? t('tr.to')}
      onKeyDown={onKeyDown}
    >
      {options.map((option, index) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            ref={register(index)}
            role="radio"
            aria-checked={active}
            tabIndex={tabIndexFor(index)}
            className={['cx-segment__item', active ? 'cx-segment__item--active' : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => onChange(option.id)}
            data-lang={lang}
          >
            <span className="cx-segment__icon">{option.icon(active)}</span>
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Amount input                                                       */
/* ------------------------------------------------------------------ */

interface AmountInputProps {
  value: string;
  onChange: (next: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  ariaLabel: string;
  autoFocus?: boolean;
  /** Focus / describedby targets, so a validation message can point here. */
  id?: string;
  describedBy?: string;
}

export function AmountInput({
  value,
  onChange,
  onBlur,
  invalid,
  ariaLabel,
  autoFocus,
  id,
  describedBy,
}: AmountInputProps) {
  const { t } = useApp();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value.replace(/[,\s]/g, '');
    if (!/^[\d.]*$/.test(normalizeDigits(next))) return;
    onChange(normalizeDigits(next));
  };

  /** Tidy up to two decimals once the field loses focus, like the reference. */
  const handleBlur = () => {
    const parsed = parseAmountInput(value);
    if (parsed > 0) {
      const tidied = (parsed / 100).toFixed(2);
      if (tidied !== value) onChange(tidied);
    }
    onBlur?.();
  };

  const display = groupAmountInput(value);

  return (
    <div className={['cx-amount', invalid ? 'cx-amount--error' : ''].filter(Boolean).join(' ')}>
      <div className="cx-amount__value">
        <input
          id={id}
          className="cx-amount__input"
          inputMode="decimal"
          autoComplete="off"
          value={display}
          onChange={handleChange}
          onBlur={handleBlur}
          style={{ width: `${Math.max(4, display.length)}ch` }}
          placeholder="0.00"
          aria-label={ariaLabel}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          autoFocus={autoFocus}
        />
        <span className="cx-amount__currency">{t('common.egp')}</span>
      </div>
      <span className="cx-amount__icon" aria-hidden="true">
        <MoneyIcon size={20} />
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Quick amounts                                                      */
/* ------------------------------------------------------------------ */

export function QuickAmountButtons({
  amounts,
  selected,
  onPick,
  ariaLabel,
}: {
  amounts: readonly number[];
  selected: number;
  onPick: (minor: number) => void;
  ariaLabel?: string;
}) {
  const { lang } = useApp();

  return (
    <div className="cx-chips" role="group" aria-label={ariaLabel}>
      {amounts.map((amount) => (
        <button
          key={amount}
          type="button"
          className={['cx-chip', selected === amount ? 'cx-chip--active' : '']
            .filter(Boolean)
            .join(' ')}
          onClick={() => onPick(amount)}
          aria-pressed={selected === amount}
        >
          +{formatCompactAmount(amount, lang)}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fields                                                             */
/* ------------------------------------------------------------------ */

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  icon?: ReactNode;
  trailing?: ReactNode;
  inputMode?: 'text' | 'tel' | 'numeric';
  variant?: 'plain' | 'phone';
  maxLength?: number;
  /** Optional value transformer, e.g. live phone-number grouping. */
  transform?: (raw: string) => string;
  /** Anchor for validation focus; also the root of the hint/error ids. */
  id?: string;
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
  icon,
  trailing,
  inputMode = 'text',
  variant = 'plain',
  maxLength,
  transform,
  id,
}: TextFieldProps) {
  const errorId = id ? `${id}-error` : undefined;
  const hintId = id ? `${id}-hint` : undefined;
  // Only one of the two ever renders, so the description stays unambiguous.
  const describedBy =
    [error ? errorId : undefined, !error && hint ? hintId : undefined]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className="cx-field">
      <span className="cx-label">{label}</span>
      <div className={['cx-inputwrap', error ? 'cx-inputwrap--error' : ''].filter(Boolean).join(' ')}>
        {icon ? <span className="cx-inputwrap__icon">{icon}</span> : null}
        <input
          id={id}
          className={['cx-input', `cx-input--${variant}`].join(' ')}
          value={value}
          inputMode={inputMode}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(event) => onChange(transform ? transform(event.target.value) : event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-label={label}
        />
        {trailing}
      </div>
      {error ? (
        <span className="cx-field__error" id={errorId}>
          {error}
        </span>
      ) : null}
      {!error && hint ? (
        <span className="cx-field__hint" id={hintId}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export function PhoneContactButton() {
  return (
    <span className="cx-inputwrap__trail" aria-hidden="true">
      <ContactsIcon size={18} />
    </span>
  );
}

export function PhoneLeadingIcon() {
  return <PhoneIcon size={18} />;
}

/* ------------------------------------------------------------------ */
/* Summary                                                            */
/* ------------------------------------------------------------------ */

interface FeeSummaryProps {
  title?: string;
  amountLabel: string;
  amountValue: string;
  feeLabel: string;
  feeValue: string;
  totalLabel: string;
  totalValue: string;
  divider?: boolean;
}

export function FeeSummary({
  title,
  amountLabel,
  amountValue,
  feeLabel,
  feeValue,
  totalLabel,
  totalValue,
  divider,
}: FeeSummaryProps) {
  const { t } = useApp();

  return (
    <section className="cx-summary" aria-label={title ?? t('tr.summary')}>
      {title ? <h2 className="cx-summary__title">{title}</h2> : null}
      <div className="cx-summary__row">
        <span className="cx-summary__key">{amountLabel}</span>
        <span className="cx-summary__val">{amountValue}</span>
      </div>
      <div className="cx-summary__row">
        <span className="cx-summary__key">
          {feeLabel}
          <span className="cx-infobtn" aria-hidden="true">
            i
          </span>
        </span>
        <span className="cx-summary__val">{feeValue}</span>
      </div>
      {divider ? <div className="cx-summary__divider" /> : null}
      <div className="cx-summary__row cx-summary__row--total">
        <span className="cx-summary__key">{totalLabel}</span>
        <span className="cx-summary__val cx-summary__val--purple">{totalValue}</span>
      </div>
    </section>
  );
}

export function InfoNotice({
  children,
  tone = 'lilac',
  icon,
  id,
}: {
  children: ReactNode;
  tone?: 'lilac' | 'green' | 'dark';
  icon?: ReactNode;
  /** Referenced by `aria-describedby` when the notice carries a validation error. */
  id?: string;
}) {
  return (
    <div className={`cx-notice cx-notice--${tone}`} id={id}>
      <span className="cx-notice__icon">
        {icon ?? <InfoIcon size={17} />}
      </span>
      <span className="cx-notice__text">{children}</span>
    </div>
  );
}

export function SecurityNotice({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="cx-notice cx-notice--lilac" style={{ justifyContent: 'space-between' }}>
      <span className="cx-notice__text" style={{ textAlign: 'start' }}>
        {title}
        <span style={{ display: 'block', color: 'var(--cx-purple)', fontWeight: 700, marginTop: 2 }}>
          {sub}
        </span>
      </span>
      <span
        style={{
          display: 'grid',
          placeItems: 'center',
          width: 34,
          height: 34,
          borderRadius: 10,
          background: 'var(--cx-grad-action)',
          color: '#fff',
          flex: 'none',
        }}
      >
        <ShieldCheckIcon size={18} />
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                            */
/* ------------------------------------------------------------------ */

interface PrimaryActionButtonProps {
  label: string;
  sub?: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  brand?: boolean;
  lock?: boolean;
  arrow?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

export function PrimaryActionButton({
  label,
  sub,
  onClick,
  variant = 'primary',
  brand = false,
  lock = false,
  arrow = true,
  loading = false,
  disabled = false,
}: PrimaryActionButtonProps) {
  return (
    <button
      type="button"
      className={`cx-btn cx-btn--${variant} cx-btn--block`}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {brand ? (
        <span className="cx-btn__lead">
          <span className="cx-btn__brand">
            <CashXMark size={22} />
          </span>
        </span>
      ) : lock ? (
        <span className="cx-btn__lead" style={{ left: 18 }}>
          <LockIcon size={22} />
        </span>
      ) : null}

      {/* The label keeps its text while loading: swapping it for a glyph would
          leave the button with no accessible name at the moment it matters. */}
      <span className="cx-btn__stack">
        <span>{label}</span>
        {sub ? <span className="cx-btn__sub">{sub}</span> : null}
      </span>

      {arrow ? (
        <span className="cx-btn__trail">
          <span className="cx-btn__arrow">
            {loading ? (
              <span className={variant === 'primary' ? 'cx-spinner' : 'cx-spinner cx-spinner--dark'} />
            ) : (
              <ArrowForwardIcon size={19} className="cx-flip" />
            )}
          </span>
        </span>
      ) : null}
    </button>
  );
}

export function SecondaryButton({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      className="cx-btn cx-btn--secondary cx-btn--sm"
      onClick={onClick}
      style={{ justifyContent: 'center', gap: 8, padding: '8px 12px' }}
    >
      {label}
      {icon}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Details / receipt rows                                             */
/* ------------------------------------------------------------------ */

type ValueTone = 'default' | 'green' | 'purple' | 'strong';

interface DetailRowProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  tone?: ValueTone;
  mono?: boolean;
  action?: ReactNode;
}

export function DetailRow({ icon, label, value, tone = 'default', mono, action }: DetailRowProps) {
  const valueClass = [
    'cx-row__val',
    tone === 'green' ? 'cx-row__val--green' : '',
    tone === 'purple' ? 'cx-row__val--purple' : '',
    tone === 'strong' ? 'cx-row__val--strong' : '',
    mono ? 'cx-row__val--mono' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="cx-row">
      <span className="cx-row__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="cx-row__key">{label}</span>
      <span className={valueClass}>
        {value}
        {action}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Success panel                                                      */
/* ------------------------------------------------------------------ */

export function SuccessPanel({
  title,
  sub,
  children,
  sparkles = true,
}: {
  title: string;
  sub: ReactNode;
  children?: ReactNode;
  sparkles?: boolean;
}) {
  return (
    <section className="cx-success">
      {sparkles ? (
        <span className="cx-sparkles" aria-hidden="true">
          <SparkleIcon size={13} />
          <SparkleIcon size={11} />
        </span>
      ) : null}
      <span className="cx-success__mark">
        <span className="cx-success__halo cx-success__halo--pulse" aria-hidden="true" />
        <span className="cx-success__check">
          {/* Drawn in with stroke-dashoffset (see .cx-check-path). */}
          <svg
            width={34}
            height={34}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path className="cx-check-path" pathLength={1} d="m5 12.8 4.6 4.6L19 7.4" />
          </svg>
        </span>
      </span>
      <h2 className="cx-success__title">{title}</h2>
      <p className="cx-success__sub">{sub}</p>
      {children}
    </section>
  );
}

export function BalanceCard({
  label,
  amount,
  lang,
}: {
  label: string;
  amount: number;
  lang: Lang;
}) {
  // Counts up from zero when the success screen appears.
  const { value: counted, counting } = useCountUpState(amount, { duration: 760 });

  return (
    <div className="cx-balance">
      <span className="cx-balance__label">{label}</span>
      <span className={['cx-balance__value', counting ? 'cx-counting' : ''].filter(Boolean).join(' ')}>
        {formatNumber(counted, lang)}
      </span>
      <span className="cx-balance__currency">{lang === 'ar' ? 'جنيه' : 'EGP'}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Route (source → destination)                                       */
/* ------------------------------------------------------------------ */

export interface RouteSide {
  logo: ReactNode;
  caption: string;
  name: string;
}

export function RoutePair({
  from,
  to,
  layout = 'split',
  plain = false,
}: {
  from: RouteSide;
  to: RouteSide;
  layout?: 'split' | 'stack';
  /** Drop the inner borders when the route already sits inside a card. */
  plain?: boolean;
}) {
  const side = (data: RouteSide) => (
    <div className="cx-route__card">
      {data.logo}
      <span className="cx-route__titles">
        <span className="cx-route__caption">{data.caption}</span>
        <span className="cx-route__name">{data.name}</span>
      </span>
    </div>
  );

  if (layout === 'stack') {
    return (
      <div className={['cx-route', 'cx-route--stack', plain ? 'cx-route--plain' : ''].filter(Boolean).join(' ')}>
        {side(from)}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <span
            className="cx-route__arrow"
            aria-hidden="true"
            style={{ border: 0, background: 'transparent', boxShadow: 'none', color: 'var(--cx-purple)' }}
          >
            <ArrowForwardIcon size={20} className="cx-flip" />
          </span>
        </div>
        {side(to)}
      </div>
    );
  }

  return (
    <div className={['cx-route', plain ? 'cx-route--plain' : ''].filter(Boolean).join(' ')}>
      {side(from)}
      <span className="cx-route__arrow" aria-hidden="true">
        <ArrowForwardIcon size={18} className="cx-flip" />
      </span>
      {side(to)}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rating                                                             */
/* ------------------------------------------------------------------ */

export function RatingRow({
  prompt,
  value,
  onChange,
}: {
  prompt: string;
  value: number;
  onChange: (next: number) => void;
}) {
  const { t, dir } = useApp();
  const { register, onKeyDown, tabIndexFor } = useRovingRadioGroup({
    count: 5,
    selectedIndex: value - 1,
    onSelectIndex: (index) => onChange(index + 1),
    direction: dir,
  });

  return (
    <div className="cx-rating">
      <span>{prompt}</span>
      <span className="cx-rating__stars" role="radiogroup" aria-label={prompt} onKeyDown={onKeyDown}>
        {[1, 2, 3, 4, 5].map((star, index) => (
          <button
            key={star}
            type="button"
            ref={register(index)}
            // A rating is a single choice, so the chosen score is the one
            // checked radio — the filled stars above it are decoration.
            role="radio"
            aria-checked={value === star}
            tabIndex={tabIndexFor(index)}
            className={['cx-star', value >= star ? 'cx-star--on' : ''].filter(Boolean).join(' ')}
            onClick={() => onChange(star)}
            aria-label={t('a11y.ratingStar', { value: star })}
          >
            <StarIcon filled={value >= star} size={22} />
          </button>
        ))}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Demo helpers                                                       */
/* ------------------------------------------------------------------ */

export function DemoBadge({ label }: { label: string }) {
  return (
    <span className="cx-demobadge">
      <CheckCircleIcon size={12} />
      {label}
    </span>
  );
}

export function DemoFailureToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      className="cx-simtoggle"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span className={['cx-switch', checked ? 'cx-switch--on' : ''].filter(Boolean).join(' ')} />
      <span>{label}</span>
    </button>
  );
}

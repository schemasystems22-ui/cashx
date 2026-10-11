import type { WalletId } from '../lib/types';
import { BankIcon } from './icons';
import { CashXMark } from './CashXLogo';

export type BrandId = WalletId | 'instapay' | 'bank' | 'cashx';

interface BrandLogoProps {
  id: BrandId;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<BrandLogoProps['size']>, string> = {
  xs: 'cx-logo--xs',
  sm: 'cx-logo--sm',
  md: '',
  lg: 'cx-logo--lg',
};

/**
 * Operator artwork, one file per brand, served from `public/assets/brands/`.
 *
 * These are the real supplied logos rather than drawn approximations, each
 * fitted into the same white rounded tile and optically normalised with a
 * per-brand zoom (see `.cx-logo__img` in `components.css`) — that is what makes
 * five different aspect ratios read as one consistent set at every tile size.
 *
 * One file per brand, always shown whole: InstaPay's stacked lockup is the
 * widest-format mark in the set, so its tile is set to the largest zoom that
 * still clears the tile edges rather than cropping the wordmark away at small
 * sizes. Seeing the mark without its wordmark next to four logos that do have
 * one reads as a missing image, not as a smaller one.
 *
 * The brand name always appears as text next to the tile (the wallet card, the
 * receipt row, the route pair), so the image is marked decorative.
 */
const BRAND_IMAGE: Partial<Record<BrandId, { src: string; label: string }>> = {
  vodafone: { src: 'vodafone.png', label: 'Vodafone Cash' },
  etisalat: { src: 'etisalat.png', label: 'Etisalat Cash' },
  orange: { src: 'orange.png', label: 'Orange Cash' },
  we: { src: 'we.png', label: 'WE Pay' },
  instapay: { src: 'instapay.png', label: 'InstaPay' },
};

/** Base-aware so the app keeps working when served from a sub-path. */
export function brandImageUrl(file: string): string {
  return `${import.meta.env.BASE_URL}assets/brands/${file}`;
}

export function BrandLogo({ id, size = 'md', className }: BrandLogoProps) {
  const image = BRAND_IMAGE[id];

  const classes = ['cx-logo', `cx-logo--${id}`, SIZE_CLASS[size], className]
    .filter(Boolean)
    .join(' ');

  if (image) {
    return (
      <span className={classes} aria-label={image.label}>
        <img
          className="cx-logo__img"
          src={brandImageUrl(image.src)}
          alt=""
          aria-hidden="true"
          draggable={false}
          decoding="async"
        />
      </span>
    );
  }

  switch (id) {
    case 'bank':
      return (
        <span className={classes} aria-label="Bank Account">
          <span style={{ color: 'var(--cx-purple)' }}>
            <BankIcon size={size === 'xs' ? 18 : size === 'sm' ? 22 : 26} />
          </span>
        </span>
      );

    default:
      return (
        <span className={classes} aria-label="CashX">
          <CashXMark size={size === 'xs' ? 18 : size === 'sm' ? 24 : 30} />
        </span>
      );
  }
}

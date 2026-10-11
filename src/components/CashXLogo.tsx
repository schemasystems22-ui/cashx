import type { CSSProperties } from 'react';

/**
 * The CashX X mark.
 *
 * Geometry sampled from the supplied brand asset (the X is built from two bent
 * bands, not two straight bars): the white band forms a ">" whose apex sits at
 * ~58% of the width, the violet band forms a "<" whose apex sits at ~42%, so
 * the two bands genuinely cross in the middle and the white band weaves in
 * front — exactly the structure of the reference artwork.
 *
 * Measured proportions (white band): flat end 26/100 wide, apex at 58/100,
 * inner notch at 32/100, full height 84/100.
 *
 * A faithful copy of the supplied source file also ships as
 * `public/assets/cashx-app-icon.jpg` and is used as the app/favicon image.
 */
export type MarkTone = 'brand' | 'mono';

interface CashXMarkProps {
  size?: number;
  tone?: MarkTone;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

/** Aspect ratio of the mark (width : height). */
const RATIO = 0.84;

const VIOLET_BAND = 'M100 0 L74 0 L42 42 L74 84 L100 84 L68 42 Z';
const WHITE_BAND = 'M0 0 L26 0 L58 42 L26 84 L0 84 L32 42 Z';

let gradientSeq = 0;

export function CashXMark({
  size = 32,
  tone = 'brand',
  className,
  style,
  title,
}: CashXMarkProps) {
  const uid = `cxm${(gradientSeq += 1)}`;
  const height = size * RATIO;

  if (tone === 'mono') {
    return (
      <svg
        width={size}
        height={height}
        viewBox="0 0 100 84"
        className={className}
        style={style}
        role={title ? 'img' : 'presentation'}
        aria-hidden={title ? undefined : true}
        aria-label={title}
      >
        {title ? <title>{title}</title> : null}
        <path d={VIOLET_BAND} fill="currentColor" opacity="0.55" />
        <path d={WHITE_BAND} fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 100 84"
      className={className}
      style={style}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={`${uid}-w`} x1="0" y1="0" x2="0.55" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="58%" stopColor="#FDFCFF" />
          <stop offset="100%" stopColor="#DED6F2" />
        </linearGradient>
        <linearGradient id={`${uid}-v`} x1="1" y1="0" x2="0.15" y2="1">
          <stop offset="0%" stopColor="#C94DFB" />
          <stop offset="40%" stopColor="#8E2DF3" />
          <stop offset="100%" stopColor="#5A1FD8" />
        </linearGradient>
      </defs>
      <g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2.5">
        <path d={VIOLET_BAND} fill={`url(#${uid}-v)`} stroke={`url(#${uid}-v)`} />
        <path d={WHITE_BAND} fill={`url(#${uid}-w)`} stroke={`url(#${uid}-w)`} />
      </g>
    </svg>
  );
}

interface CashXWordmarkProps {
  /** Font size of the `Cash` part; the X scales with it. */
  size?: number;
  className?: string;
  showX?: boolean;
}

/** `Cash` + the brand X, as used in the app header. */
export function CashXWordmark({ size = 31, className, showX = true }: CashXWordmarkProps) {
  return (
    <span
      className={['cx-wordmark', className].filter(Boolean).join(' ')}
      style={{ fontSize: size }}
      dir="ltr"
    >
      <span>Cash</span>
      {showX ? (
        <span className="cx-wordmark__x">
          <CashXMark size={size * 0.98} title="CashX" />
        </span>
      ) : null}
    </span>
  );
}

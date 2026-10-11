import type { ReactNode } from 'react';

interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
  filled?: boolean;
}

function Icon({
  size = 20,
  className,
  strokeWidth = 1.7,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const MenuIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);

export const BellIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M18 15.5V11a6 6 0 1 0-12 0v4.5L4.5 18h15L18 15.5Z" />
    <path d="M10 21h4" />
  </Icon>
);

export const ArrowBackIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 12H4" />
    <path d="m10 6-6 6 6 6" />
  </Icon>
);

export const ArrowForwardIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 12h16" />
    <path d="m14 6 6 6-6 6" />
  </Icon>
);

export const WalletPlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H16a2 2 0 0 1 2 2v1" />
    <path d="M3 8.5V17a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-2" />
    <path d="M21.5 10.5h-4.25a1.75 1.75 0 0 0 0 3.5h4.25v-3.5Z" />
    <path d="M9 3.5v4M7 5.5h4" />
  </Icon>
);

export const HelpIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9.4 9.2a2.7 2.7 0 1 1 3.4 2.9c-.6.2-.8.7-.8 1.3v.6" />
    <path d="M12 17.2h.01" />
  </Icon>
);

export const CheckIcon = ({ strokeWidth = 2.6, ...rest }: IconProps) => (
  <Icon strokeWidth={strokeWidth} {...rest}>
    <path d="m5 12.8 4.6 4.6L19 7.4" />
  </Icon>
);

export const CheckCircleIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.4 12.3 2.5 2.5 4.7-5" />
  </Icon>
);

export const InfoIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.8h.01" />
  </Icon>
);

export const MoneyIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.5" y="6" width="19" height="12" rx="2.4" />
    <circle cx="12" cy="12" r="2.4" />
    <path d="M6 9.6h.01M18 14.4h.01" />
  </Icon>
);

export const PercentIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M19 5 5 19" />
    <circle cx="7.5" cy="7.5" r="2.3" />
    <circle cx="16.5" cy="16.5" r="2.3" />
  </Icon>
);

export const CalendarIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="2.4" />
    <path d="M3.5 10h17M8 3.5V6M16 3.5V6" />
  </Icon>
);

export const ReceiptIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="5" width="17" height="14" rx="2.4" />
    <path d="M7.5 9.5H11M7.5 13h6" />
    <path d="M15.5 9.5h1.5" />
  </Icon>
);

export const CopyIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2.2" />
    <path d="M15 6.5A2 2 0 0 0 13 4.5H6.5A2 2 0 0 0 4.5 6.5V13a2 2 0 0 0 2 2" />
  </Icon>
);

export const UserIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="8.5" r="3.6" />
    <path d="M4.8 19.5c1-3.3 3.8-5 7.2-5s6.2 1.7 7.2 5" />
  </Icon>
);

export const CardIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="6" width="18" height="13" rx="2.4" />
    <path d="M3 10.5h18M7 15h3" />
    <path d="M16.5 15h1.5" />
  </Icon>
);

export const HomeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 10.6 12 4.5l8 6.1V19a1.4 1.4 0 0 1-1.4 1.4H5.4A1.4 1.4 0 0 1 4 19v-8.4Z" />
    <path d="M9.6 20.4v-5.6h4.8v5.6" />
  </Icon>
);

export const ClockIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.6V12l3 2" />
  </Icon>
);

export const ShareIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="6" cy="12" r="2.4" />
    <circle cx="17.5" cy="6.5" r="2.4" />
    <circle cx="17.5" cy="17.5" r="2.4" />
    <path d="m8.2 10.8 7-3.1M8.2 13.2l7 3.1" />
  </Icon>
);

export const LockIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4.8" y="10.5" width="14.4" height="9.5" rx="2.2" />
    <path d="M8.4 10.5V8.2a3.6 3.6 0 0 1 7.2 0v2.3" />
  </Icon>
);

export const ShieldCheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5 19 6v5.6c0 4-2.9 7.3-7 8.4-4.1-1.1-7-4.4-7-8.4V6l7-2.5Z" />
    <path d="m9 12 2.2 2.2L15.4 10" />
  </Icon>
);

export const ZapIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13.5 3 6 13.4h4.8L10 21l7.6-10.5h-4.9L13.5 3Z" />
  </Icon>
);

export const BankIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 9.6 12 4.5l8.5 5.1" />
    <path d="M5.5 10.5V18M10 10.5V18M14 10.5V18M18.5 10.5V18" />
    <path d="M3.5 19.6h17" />
  </Icon>
);

export const WalletIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 8A2.5 2.5 0 0 1 6 5.5h11A2.5 2.5 0 0 1 19.5 8v1" />
    <rect x="3.5" y="9" width="17" height="10" rx="2.4" />
    <path d="M20.5 12.2h-3.2a1.6 1.6 0 0 0 0 3.2h3.2" />
  </Icon>
);

export const EditIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 19.5h4L19 9a2.1 2.1 0 0 0-3-3L5.5 16.5l-1 3Z" />
    <path d="m14.8 6.8 2.4 2.4" />
  </Icon>
);

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5.5v13M5.5 12h13" />
  </Icon>
);

export const PhoneIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6.4 3.8 8.8 6a1.4 1.4 0 0 1 .1 1.9L7.7 9.5a11 11 0 0 0 5 5l1.6-1.2a1.4 1.4 0 0 1 1.9.1l2.2 2.4a1.4 1.4 0 0 1-.1 2l-1.3 1.2c-.9.8-2.2 1-3.3.5a20.5 20.5 0 0 1-7.6-7.6c-.5-1.1-.3-2.4.5-3.3l1.2-1.3a1.4 1.4 0 0 1 2-.1Z" />
  </Icon>
);

export const ContactsIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.2" />
    <path d="M9.5 4.5v15" />
    <circle cx="15" cy="10.4" r="2" />
    <path d="M12.6 15.8c.4-1.2 1.3-1.8 2.4-1.8s2 .6 2.4 1.8" />
  </Icon>
);

export const SmileIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M8.6 14c.8 1.3 2 2 3.4 2s2.6-.7 3.4-2" />
    <path d="M9.4 9.6h.01M14.6 9.6h.01" />
  </Icon>
);

export const StarIcon = ({ filled, size = 22 }: { filled?: boolean; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m12 4 2.5 5.2 5.5.8-4 3.9 1 5.6-5-2.7-5 2.7 1-5.6-4-3.9 5.5-.8L12 4Z" />
  </svg>
);

export const SparkleIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 3.5 13.6 9 19 10.6 13.6 12.2 12 17.7 10.4 12.2 5 10.6 10.4 9 12 3.5Z" />
  </svg>
);

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const GridIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4" y="4" width="7" height="7" rx="1.8" />
    <rect x="13" y="4" width="7" height="7" rx="1.8" />
    <rect x="4" y="13" width="7" height="7" rx="1.8" />
    <rect x="13" y="13" width="7" height="7" rx="1.8" />
  </Icon>
);

export const DownloadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4v10" />
    <path d="m8 10.5 4 4 4-4" />
    <path d="M5 18.5h14" />
  </Icon>
);

export const ImageIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m4.5 17 4.2-4.2a1.6 1.6 0 0 1 2.2 0l3.1 3.1 1.6-1.6a1.6 1.6 0 0 1 2.2 0l2.2 2.2" />
  </Icon>
);

/** A page with a folded corner: the PDF option. */
export const FileIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14 3.5H7.5A2 2 0 0 0 5.5 5.5v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z" />
    <path d="M14 3.5V8h4.5" />
  </Icon>
);

/**
 * A chat bubble with a handset in it — the WhatsApp shape, drawn from scratch
 * rather than lifting a brand path, and in the same stroke weight as the rest of
 * the set.
 */
export const WhatsAppIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20.6 11.9a8.6 8.6 0 0 1-12.7 7.6l-4.4 1.2 1.2-4.3A8.6 8.6 0 1 1 20.6 11.9z" />
    <path d="M9.3 9.2c.5 2.4 2.2 4.1 4.6 4.6l1.1-1.5 1.8.7c-.3 1.1-1.4 1.9-2.6 1.9a6.4 6.4 0 0 1-6.4-6.4c0-1.2.8-2.3 1.9-2.6l.7 1.8z" />
  </Icon>
);

/** Three finder patterns plus a scattering of modules. */
export const QrIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.6" />
    <rect x="14" y="3.5" width="6.5" height="6.5" rx="1.6" />
    <rect x="3.5" y="14" width="6.5" height="6.5" rx="1.6" />
    <path d="M14 14h2.5v2.5H14zM18 14h2.5v2.5H18zM14 18h2.5v2.5H14zM18 18h2.5v2.5H18z" />
  </Icon>
);

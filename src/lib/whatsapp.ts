/*
 * Sending the receipt through WhatsApp.
 *
 * WhatsApp exposes no web API for attaching a file, so the honest strategy is
 * two-tier and depends on the platform:
 *
 *  1. **Phones (Android / iOS).** `navigator.share` with a `File` opens the
 *     system sheet, where WhatsApp is one of the targets and the receipt image
 *     arrives as a real attachment. This is an actual send.
 *  2. **Desktop.** `wa.me` can only carry text, so the message *is* the receipt
 *     — every line labelled — and the image is saved alongside it so it can be
 *     attached by hand. WhatsApp Web opens with the text already in the box.
 *
 * Both paths hand off to WhatsApp itself; nothing is sent on the user's behalf
 * without them pressing send in their own app.
 */

export type WhatsAppOutcome =
  /** Handed to the OS share sheet (the user picked WhatsApp there). */
  | 'shared'
  /** wa.me opened in a new tab with the receipt text. */
  | 'opened'
  /** The user dismissed the share sheet. */
  | 'cancelled'
  /** Neither path was available, or the popup was blocked. */
  | 'failed';

type ShareCapableNavigator = Navigator & {
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
};

/** The link that opens WhatsApp with a pre-filled message. */
export function whatsAppLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Opens `wa.me` in a new tab.
 *
 * Called synchronously from the click handler's own async chain it would be fine,
 * but the image has to be rendered first — by then the popup is no longer
 * "user-initiated" in Safari, so a blocked popup is reported rather than
 * silently swallowed.
 */
function openWhatsApp(text: string): boolean {
  const tab = window.open(whatsAppLink(text), '_blank', 'noopener,noreferrer');
  return tab !== null;
}

export interface WhatsAppPayload {
  /** The receipt card, rendered as a PNG. */
  blob: Blob;
  filename: string;
  /** Plain-text receipt, used for the desktop path and as the share body. */
  text: string;
  title: string;
  /** Saves the image on platforms that cannot attach one. */
  fallbackSave: () => void;
}

export async function sendReceiptOnWhatsApp({
  blob,
  filename,
  text,
  title,
  fallbackSave,
}: WhatsAppPayload): Promise<WhatsAppOutcome> {
  const nav = navigator as ShareCapableNavigator;

  if (typeof nav.share === 'function') {
    let file: File | null = null;
    try {
      file = new File([blob], filename, { type: blob.type });
    } catch {
      /* Older engines without the File constructor — fall through. */
    }

    if (file && (typeof nav.canShare !== 'function' || nav.canShare({ files: [file] }))) {
      try {
        await nav.share({ files: [file], text, title });
        return 'shared';
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
        /* Anything else: fall back to the text route below. */
      }
    }
  }

  // Desktop: no way to attach, so save the card first and send the text.
  fallbackSave();
  return openWhatsApp(text) ? 'opened' : 'failed';
}

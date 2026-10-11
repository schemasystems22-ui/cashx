import type { Lang } from './types';

export interface ShareOutcome {
  status: 'shared' | 'copied' | 'failed';
}

/** Clipboard write that works on http://localhost and secure contexts. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Shares the receipt through the OS share sheet when the browser supports it
 * and falls back to copying the text.
 */
export async function shareReceipt(text: string, title: string): Promise<ShareOutcome> {
  const nav = navigator as Navigator & {
    share?: (data: { title?: string; text?: string }) => Promise<void>;
  };

  if (typeof nav.share === 'function') {
    try {
      await nav.share({ title, text });
      return { status: 'shared' };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { status: 'failed' };
      }
    }
  }

  const copied = await copyText(text);
  return { status: copied ? 'copied' : 'failed' };
}

/** Plain-text receipt that can be pasted anywhere. */
export function buildReceiptText(lines: string[], lang: Lang): string {
  const header = lang === 'ar' ? 'إيصال CashX (عرض توضيحي)' : 'CashX receipt (demo)';
  return [header, ...lines, lang === 'ar' ? 'لا تُمثّل هذه العملية دفعًا حقيقيًا.' : 'This is not a real payment.'].join(
    '\n',
  );
}

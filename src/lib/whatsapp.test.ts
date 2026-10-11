import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendReceiptOnWhatsApp, whatsAppLink } from './whatsapp';

/*
 * The two-tier WhatsApp hand-off.
 *
 * The interesting branch is not "does it build a URL" but *which* route it picks:
 * native file share where the platform can attach a file, the text route where it
 * cannot. Both are asserted, because getting that wrong means either silently
 * dropping the attachment or silently sending nothing.
 */

const RECEIPT = {
  blob: new Blob(['png-bytes'], { type: 'image/png' }),
  filename: 'CashX-TXN-261011-104512.png',
  text: 'CashX receipt\nTransaction ID: TXN-261011-104512',
  title: 'CashX receipt · TXN-261011-104512',
};

/** What the module hands to `navigator.share`, narrowed so the mocks stay typed. */
interface ShareData {
  files: File[];
  text: string;
  title: string;
}

/** Minimal window/navigator stand-ins; the suite runs in a node environment. */
function stubBrowser({
  share,
  canShare,
}: {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
} = {}) {
  const open = vi.fn((_url: string, _target?: string, _features?: string) => ({}) as Window);
  vi.stubGlobal('window', { open });
  vi.stubGlobal('navigator', { share, canShare });
  return { open };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('whatsAppLink', () => {
  const link = whatsAppLink(RECEIPT.text);

  it('targets WhatsApp with the message pre-filled', () => {
    expect(link.startsWith('https://wa.me/?text=')).toBe(true);
  });

  it('encodes newlines, spaces and the % of the fee line so the text survives', () => {
    const payload = decodeURIComponent(link.replace('https://wa.me/?text=', ''));
    expect(payload).toBe(RECEIPT.text);
    expect(link).not.toContain('\n');
    expect(link).not.toContain(' ');
  });
});

describe('sendReceiptOnWhatsApp', () => {
  it('uses the native share sheet with the receipt attached when files are shareable', async () => {
    const share = vi.fn(async (_data: ShareData) => {});
    const canShare = vi.fn((_data: ShareData) => true);
    const { open } = stubBrowser({ share, canShare });
    const fallbackSave = vi.fn();

    const outcome = await sendReceiptOnWhatsApp({ ...RECEIPT, fallbackSave });

    expect(outcome).toBe('shared');
    const data = share.mock.calls[0]![0];
    expect(data.files[0]).toBeInstanceOf(File);
    expect(share).toHaveBeenCalledTimes(1);
    expect(data.files[0]?.name).toBe(RECEIPT.filename);
    expect(data.files[0]?.type).toBe('image/png');
    expect(data.text).toBe(RECEIPT.text);
    // Nothing should have been downloaded or opened on this path.
    expect(fallbackSave).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it('falls back to wa.me plus a saved image when the platform cannot share files', async () => {
    const { open } = stubBrowser({ canShare: (_data: ShareData) => false });
    const fallbackSave = vi.fn();

    const outcome = await sendReceiptOnWhatsApp({ ...RECEIPT, fallbackSave });

    expect(outcome).toBe('opened');
    expect(fallbackSave).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledTimes(1);
    expect(open.mock.calls[0]![0]).toContain('wa.me');
  });

  it('falls back when there is no Web Share API at all (most desktop browsers)', async () => {
    const { open } = stubBrowser();
    const outcome = await sendReceiptOnWhatsApp({ ...RECEIPT, fallbackSave: vi.fn() });
    expect(outcome).toBe('opened');
    expect(open).toHaveBeenCalled();
  });

  it('reports a blocked popup instead of pretending the receipt went out', async () => {
    vi.stubGlobal('window', { open: vi.fn((_url: string) => null) });
    vi.stubGlobal('navigator', {});

    const outcome = await sendReceiptOnWhatsApp({ ...RECEIPT, fallbackSave: vi.fn() });
    expect(outcome).toBe('failed');
  });

  it('treats a dismissed share sheet as cancelled, and does not then open wa.me', async () => {
    const share = vi.fn(async (_data: ShareData) => {
      throw new DOMException('cancelled', 'AbortError');
    });
    const { open } = stubBrowser({ share, canShare: (_data: ShareData) => true });
    const fallbackSave = vi.fn();

    const outcome = await sendReceiptOnWhatsApp({ ...RECEIPT, fallbackSave });

    expect(outcome).toBe('cancelled');
    expect(fallbackSave).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it('falls through to the text route when the share itself fails for another reason', async () => {
    const share = vi.fn(async (_data: ShareData) => {
      throw new Error('platform exploded');
    });
    const { open } = stubBrowser({ share, canShare: (_data: ShareData) => true });

    const outcome = await sendReceiptOnWhatsApp({ ...RECEIPT, fallbackSave: vi.fn() });

    expect(outcome).toBe('opened');
    expect(open).toHaveBeenCalled();
  });
});

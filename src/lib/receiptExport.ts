import { buildPdfFromJpeg } from './pdf';
import { createQrMatrix } from './qr';
import type { ReceiptModel } from './receipt';
import { receiptFileName } from './receipt';
import {
  canvasToJpegBlob,
  canvasToPngBlob,
  ensureReceiptFonts,
  renderReceiptToCanvas,
} from './receiptImage';
import { sendReceiptOnWhatsApp, type WhatsAppOutcome } from './whatsapp';

/** Raster scale for exported receipts. 2.5 keeps text crisp when zoomed in. */
const EXPORT_SCALE = 2.5;

function requireBlob(blob: Blob | null, what: string): Blob {
  if (!blob) throw new Error(`Could not encode the receipt ${what}`);
  return blob;
}

/** Renders the receipt as a PNG. */
export async function exportReceiptImage(model: ReceiptModel): Promise<Blob> {
  await ensureReceiptFonts(EXPORT_SCALE);
  const canvas = renderReceiptToCanvas(model, {
    scale: EXPORT_SCALE,
    matrix: createQrMatrix(model.qrPayload),
  });
  return requireBlob(await canvasToPngBlob(canvas), 'image');
}

/**
 * Renders the receipt as a single-page A4 PDF.
 *
 * The page embeds a JPEG rather than a PNG because `DCTDecode` lets the PDF wrap
 * the compressed bytes directly — no image re-encoding, so the file stays small.
 */
export async function exportReceiptPdf(model: ReceiptModel): Promise<Blob> {
  await ensureReceiptFonts(EXPORT_SCALE);
  const canvas = renderReceiptToCanvas(model, {
    scale: EXPORT_SCALE,
    matrix: createQrMatrix(model.qrPayload),
  });

  // A white matte behind the card: JPEG has no alpha channel.
  const flattened = document.createElement('canvas');
  flattened.width = canvas.width;
  flattened.height = canvas.height;
  const ctx = flattened.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, flattened.width, flattened.height);
    ctx.drawImage(canvas, 0, 0);
  }

  const jpeg = requireBlob(
    await canvasToJpegBlob(ctx ? flattened : canvas, 0.92),
    'image',
  );

  const bytes = buildPdfFromJpeg({
    jpeg: new Uint8Array(await jpeg.arrayBuffer()),
    pixelWidth: flattened.width,
    pixelHeight: flattened.height,
  });

  // Copied into a plain ArrayBuffer: `Uint8Array` is generic over its buffer
  // type in newer TypeScript, which `BlobPart` does not accept.
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  return new Blob([buffer], { type: 'application/pdf' });
}

/** Triggers a browser download without navigating away. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Give the download a moment to start before releasing the URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export type FileShareOutcome = 'shared' | 'cancelled' | 'unsupported';

/**
 * Shares a file through the OS share sheet.
 *
 * Returns `'unsupported'` when the browser cannot share files (most desktop
 * browsers), so the caller can fall back to downloading instead.
 */
export async function shareFile(
  blob: Blob,
  filename: string,
  title: string,
): Promise<FileShareOutcome> {
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  if (typeof nav.share !== 'function') return 'unsupported';

  const file = new File([blob], filename, { type: blob.type });
  if (typeof nav.canShare === 'function' && !nav.canShare({ files: [file] })) {
    return 'unsupported';
  }

  try {
    await nav.share({ files: [file], title });
    return 'shared';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    return 'unsupported';
  }
}

/** `CashX-TXN-261011-104512.png` / `.pdf`. */
export function receiptExportName(id: string, format: 'image' | 'pdf'): string {
  return receiptFileName(id, format === 'pdf' ? 'pdf' : 'png');
}

/**
 * Renders the receipt card and hands it to WhatsApp.
 *
 * Kept here rather than in the screens so both success screens share one path:
 * render the PNG once, then let `sendReceiptOnWhatsApp` decide between the OS
 * share sheet and the `wa.me` text route. `text` is the plain-text receipt,
 * which is what actually travels on desktop. Returns the outcome so the caller
 * can report it; nothing throws for an expected platform limitation.
 */
export async function whatsAppReceipt(
  model: ReceiptModel,
  text: string,
): Promise<WhatsAppOutcome> {
  const blob = await exportReceiptImage(model);
  return sendReceiptOnWhatsApp({
    blob,
    filename: receiptExportName(model.id, 'image'),
    text,
    title: `${model.heading} · ${model.id}`,
    // The desktop route can only carry text, so the card is saved for attaching.
    fallbackSave: () => downloadBlob(blob, receiptExportName(model.id, 'image')),
  });
}

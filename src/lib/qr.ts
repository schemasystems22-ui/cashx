/**
 * `qrcode` is the app's one runtime dependency beyond React. It is CommonJS, so
 * its canvas/SVG renderers come along in the bundle even though this app draws
 * the symbol itself — importing the encoder core directly saves only ~4 kB raw
 * and would need a hand-written type shim, so the plain import is used instead.
 */
import QRCode from 'qrcode';

/**
 * Error correction level. `Q` (25% recovery) is chosen over the default `M`
 * because an exported receipt is likely to be photographed off a screen.
 */
export const QR_ERROR_CORRECTION = 'Q' as const;

/** Required empty border around the symbol, in modules (ISO/IEC 18004). */
export const QR_QUIET_ZONE = 4;

export interface QrMatrix {
  /** Module count per side, excluding the quiet zone. */
  size: number;
  /** True when the module at (x, y) is dark. */
  isDark(x: number, y: number): boolean;
}

/**
 * Builds the module matrix for a payload.
 *
 * Deliberately returns plain data rather than an image: the same matrix feeds
 * the on-screen `<svg>` and the exported canvas, so the printed receipt and the
 * on-screen code can never disagree.
 */
export function createQrMatrix(text: string): QrMatrix {
  const symbol = QRCode.create(text, { errorCorrectionLevel: QR_ERROR_CORRECTION });
  const { size } = symbol.modules;

  return {
    size,
    isDark(x: number, y: number) {
      if (x < 0 || y < 0 || x >= size || y >= size) return false;
      return symbol.modules.get(y, x) === 1;
    },
  };
}

/**
 * What the QR code carries.
 *
 * The transaction ID verbatim, per the brief. Everything needed to change this
 * to a deep link (`?screen=transaction&id=…`) lives here in one line.
 */
export function receiptQrPayload(transactionId: string): string {
  return transactionId;
}

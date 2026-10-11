import { QR_QUIET_ZONE, createQrMatrix } from './qr';
import type { ReceiptModel, ReceiptRow } from './receipt';

/**
 * The receipt card is laid out in logical units and then scaled, so the exported
 * image is resolution-independent while the geometry stays readable in one place.
 *
 * The height is *measured*, not fixed: an add-balance receipt has five detail
 * rows and a transfer receipt has six, and a fixed height made the QR code
 * collide with the last rows. `measureReceipt` is exported so that invariant can
 * be asserted in tests rather than eyeballed.
 */
export const RECEIPT_WIDTH = 380;

const PAD_X = 22;
const HEADER_HEIGHT = 128;
const PANEL_INSET = 8;
const PANEL_TOP = HEADER_HEIGHT - 26;
const PANEL_PAD_X = 14; // inner padding, so rows clear the panel edge
const PANEL_PAD_BOTTOM = 12;

const PILL_HEIGHT = 22;
const AMOUNT_SIZE = 29;
const AMOUNT_LABEL_SIZE = 11.5;
const ROUTE_HEIGHT = 56;
const ROW_PITCH = 34;
const ROW_TEXT_SIZE = 11.5;
const QR_SIZE = 108;
const QR_GAP_ABOVE = 16;
const ID_GAP_BELOW_QR = 17;
const FOOTER_SIZE = 9.5;
const FOOTER_GAP = 15;
const BOTTOM_PAD = 11;

const COLOR = {
  deep: '#09051E',
  headerTop: '#1A0940',
  headerBottom: '#0E0526',
  panel: '#FFFFFF',
  text: '#17152E',
  text2: '#85839A',
  border: '#E8E5EF',
  lilac: '#F4EEFF',
  purple: '#5420D8',
  purpleBright: '#792CF0',
  green: '#159447',
  greenSoft: '#E8F6EE',
  white: '#FFFFFF',
} as const;

/** Font stacks mirror the CSS so the image matches the app. */
const LATIN = 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
const ARABIC = 'Cairo, Tajawal, Inter, system-ui, sans-serif';

function font(lang: ReceiptModel['lang'], weight: number, size: number): string {
  return `${weight} ${size}px ${lang === 'ar' ? ARABIC : LATIN}`;
}

export interface ReceiptLayout {
  width: number;
  height: number;
  panel: { x: number; y: number; width: number; height: number };
  /** Left/right edges available to rows (inside the panel padding). */
  content: { left: number; right: number };
  centre: number;
  pillY: number;
  amountBaseline: number;
  amountLabelBaseline: number;
  route: { y: number; height: number } | null;
  rowsStart: number;
  rowsEnd: number;
  qr: { x: number; y: number; size: number; total: number };
  idBaseline: number;
  footerBaseline: number;
  panelBottom: number;
}

/**
 * Computes every position before anything is drawn, so the total height can grow
 * with the content and the QR block is always pushed below the last row.
 */
export function measureReceipt(model: ReceiptModel): ReceiptLayout {
  const width = RECEIPT_WIDTH;
  const centre = width / 2;
  const panelWidth = width - PANEL_INSET * 2;
  const content = { left: PAD_X + PANEL_PAD_X, right: width - PAD_X - PANEL_PAD_X };

  let cursor = HEADER_HEIGHT + 14;
  const pillY = cursor;
  cursor += 38;

  const amountBaseline = cursor + 21;
  cursor += 31;

  const amountLabelBaseline = cursor + 14;
  cursor += 33;

  const route = model.route ? { y: cursor, height: ROUTE_HEIGHT } : null;
  if (route) cursor += ROUTE_HEIGHT + 12;

  const rowsStart = cursor;
  const rowsEnd = rowsStart + model.rows.length * ROW_PITCH;

  const qrTotal = QR_SIZE + QR_QUIET_ZONE * 2;
  const qrY = rowsEnd + QR_GAP_ABOVE;

  const idBaseline = qrY + qrTotal + ID_GAP_BELOW_QR;
  const panelBottom = idBaseline + PANEL_PAD_BOTTOM;
  const panel = {
    x: PANEL_INSET,
    y: PANEL_TOP,
    width: panelWidth,
    height: panelBottom - PANEL_TOP,
  };

  const footerBaseline = panelBottom + FOOTER_GAP + FOOTER_SIZE;
  const height = footerBaseline + BOTTOM_PAD;

  return {
    width,
    height,
    panel,
    content,
    centre,
    pillY,
    amountBaseline,
    amountLabelBaseline,
    route,
    rowsStart,
    rowsEnd,
    qr: { x: centre - qrTotal / 2, y: qrY, size: QR_SIZE, total: qrTotal },
    idBaseline,
    footerBaseline,
    panelBottom,
  };
}

export interface RenderReceiptOptions {
  /** Device pixel multiplier. 2.5 is enough for a crisp printed receipt. */
  scale?: number;
  /** Pre-built matrix; the caller can reuse the one the UI already rendered. */
  matrix?: ReturnType<typeof createQrMatrix>;
}

/**
 * Waits for the webfonts to be usable before drawing.
 *
 * Canvas text is rasterised at draw time and does **not** re-flow when a webfont
 * finishes loading, so drawing early silently falls back to a system face.
 */
export async function ensureReceiptFonts(scale = 1): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  await Promise.all([
    document.fonts.load(`700 ${22 * scale}px Cairo`).catch(() => undefined),
    document.fonts.load(`800 ${22 * scale}px Inter`).catch(() => undefined),
  ]);
  await document.fonts.ready.catch(() => undefined);
}

/**
 * Draws the receipt onto a canvas.
 *
 * Arabic is drawn with `ctx.direction = 'rtl'`, which makes the platform text
 * shaper join and order the glyphs correctly — including inside a mixed line
 * such as `1,000.00 جنيه`.
 */
export function renderReceiptToCanvas(
  model: ReceiptModel,
  options: RenderReceiptOptions = {},
): HTMLCanvasElement {
  const scale = options.scale ?? 2;
  const rtl = model.lang === 'ar';
  const layout = measureReceipt(model);

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(layout.width * scale);
  canvas.height = Math.round(layout.height * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.scale(scale, scale);
  ctx.textBaseline = 'alphabetic';

  // ---- background -------------------------------------------------
  ctx.fillStyle = COLOR.panel;
  ctx.fillRect(0, 0, layout.width, layout.height);

  // ---- dark header ------------------------------------------------
  const header = ctx.createLinearGradient(0, 0, layout.width * 0.4, HEADER_HEIGHT);
  header.addColorStop(0, COLOR.headerTop);
  header.addColorStop(1, COLOR.headerBottom);
  ctx.fillStyle = header;
  ctx.fillRect(0, 0, layout.width, HEADER_HEIGHT);

  ctx.fillStyle = 'rgba(255,255,255,0.68)';
  ctx.font = font(model.lang, 600, 11.5);
  ctx.direction = rtl ? 'rtl' : 'ltr';
  ctx.textAlign = 'center';
  ctx.fillText(model.tagline, layout.centre, 30);

  drawWordmark(ctx, layout.centre, 66, 30);

  // ---- white panel -------------------------------------------------
  roundRect(ctx, layout.panel.x, layout.panel.y, layout.panel.width, layout.panel.height, 18);
  ctx.fillStyle = COLOR.panel;
  ctx.fill();
  ctx.strokeStyle = COLOR.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  drawStatusPill(ctx, model, layout);
  drawHeadline(ctx, model, layout);

  if (model.route) {
    drawRoute(ctx, model, layout);
  }

  model.rows.forEach((row, index) => {
    const y = layout.rowsStart + index * ROW_PITCH;
    drawRow(ctx, row, y, layout, model.lang);
  });

  const matrix = options.matrix ?? createQrMatrix(model.qrPayload);
  drawQr(ctx, matrix, layout.qr.x, layout.qr.y, layout.qr.size);

  ctx.fillStyle = COLOR.text;
  ctx.font = font(model.lang, 700, 11.5);
  ctx.textAlign = 'center';
  ctx.direction = 'ltr';
  ctx.fillText(model.id, layout.centre, layout.idBaseline);

  ctx.fillStyle = COLOR.text2;
  ctx.font = font(model.lang, 600, FOOTER_SIZE);
  ctx.direction = rtl ? 'rtl' : 'ltr';
  ctx.fillText(model.footer, layout.centre, layout.footerBaseline);

  return canvas;
}

function drawStatusPill(
  ctx: CanvasRenderingContext2D,
  model: ReceiptModel,
  layout: ReceiptLayout,
): void {
  ctx.font = font(model.lang, 800, 11);
  ctx.direction = model.lang === 'ar' ? 'rtl' : 'ltr';
  const pillWidth = ctx.measureText(model.status).width + 26;
  const green = model.statusTone === 'green';

  roundRect(ctx, layout.centre - pillWidth / 2, layout.pillY, pillWidth, PILL_HEIGHT, PILL_HEIGHT / 2);
  ctx.fillStyle = green ? COLOR.greenSoft : '#FDECEB';
  ctx.fill();

  ctx.fillStyle = green ? COLOR.green : '#C02A22';
  ctx.textAlign = 'center';
  ctx.fillText(model.status, layout.centre, layout.pillY + 15);
}

function drawHeadline(
  ctx: CanvasRenderingContext2D,
  model: ReceiptModel,
  layout: ReceiptLayout,
): void {
  ctx.textAlign = 'center';
  ctx.direction = model.lang === 'ar' ? 'rtl' : 'ltr';
  ctx.fillStyle = COLOR.text;
  ctx.font = font(model.lang, 800, AMOUNT_SIZE);
  ctx.fillText(model.amount, layout.centre, layout.amountBaseline);

  ctx.fillStyle = COLOR.text2;
  ctx.font = font(model.lang, 600, AMOUNT_LABEL_SIZE);
  ctx.fillText(model.amountLabel, layout.centre, layout.amountLabelBaseline);
}

function drawRoute(
  ctx: CanvasRenderingContext2D,
  model: ReceiptModel,
  layout: ReceiptLayout,
): void {
  const route = layout.route;
  if (!route) return;

  const rtl = model.lang === 'ar';
  const { left, right } = layout.content;

  roundRect(ctx, left, route.y, right - left, route.height, 12);
  ctx.fillStyle = COLOR.lilac;
  ctx.fill();

  // Source on the leading side, destination on the trailing side.
  const fromX = rtl ? right - 12 : left + 12;
  ctx.textAlign = rtl ? 'right' : 'left';
  ctx.direction = rtl ? 'rtl' : 'ltr';
  ctx.fillStyle = COLOR.text;
  ctx.font = font(model.lang, 800, 12.5);
  ctx.fillText(fit(ctx, model.route!.from.name, 124), fromX, route.y + 25);
  ctx.fillStyle = COLOR.text2;
  ctx.font = font(model.lang, 600, 10);
  ctx.fillText(model.route!.from.caption, fromX, route.y + 41);

  const toX = rtl ? left + 12 : right - 12;
  ctx.textAlign = rtl ? 'left' : 'right';
  ctx.fillStyle = COLOR.text;
  ctx.font = font(model.lang, 800, 12.5);
  ctx.fillText(fit(ctx, model.route!.to.name, 124), toX, route.y + 25);
  ctx.fillStyle = COLOR.text2;
  ctx.font = font(model.lang, 600, 10);
  ctx.fillText(model.route!.to.caption, toX, route.y + 41);

  drawChevron(ctx, layout.centre, route.y + 28, rtl ? -1 : 1, COLOR.purple);
}

function drawRow(
  ctx: CanvasRenderingContext2D,
  row: ReceiptRow,
  y: number,
  layout: ReceiptLayout,
  lang: ReceiptModel['lang'],
): void {
  const rtl = lang === 'ar';
  const { left, right } = layout.content;

  const tone =
    row.tone === 'green' ? COLOR.green : row.tone === 'purple' ? COLOR.purple : COLOR.text;

  ctx.direction = rtl ? 'rtl' : 'ltr';
  ctx.textAlign = rtl ? 'right' : 'left';
  ctx.fillStyle = COLOR.text2;
  ctx.font = font(lang, 600, ROW_TEXT_SIZE);
  ctx.fillText(row.label, rtl ? right : left, y + 13);

  ctx.textAlign = rtl ? 'left' : 'right';
  ctx.fillStyle = tone;
  ctx.font = font(lang, 700, ROW_TEXT_SIZE);
  // Values such as `010 1234 5678` are Latin runs: laying them out with the
  // rtl paragraph direction reverses their groups to `5678 1234 010`, which is
  // not what the reference screens show. Values that do contain Arabic keep the
  // paragraph direction. Alignment is set separately, so this cannot shift the
  // value off its side of the row.
  ctx.direction = hasArabic(row.value) ? (rtl ? 'rtl' : 'ltr') : 'ltr';
  ctx.fillText(row.value, rtl ? left : right, y + 13);

  ctx.strokeStyle = COLOR.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, y + 24);
  ctx.lineTo(right, y + 24);
  ctx.stroke();
}

/** The brand X, drawn from the same geometry as `CashXLogo.tsx`. */
const VIOLET_BAND: [number, number][] = [
  [100, 0],
  [74, 0],
  [42, 42],
  [74, 84],
  [100, 84],
  [68, 42],
];
const WHITE_BAND: [number, number][] = [
  [0, 0],
  [26, 0],
  [58, 42],
  [26, 84],
  [0, 84],
  [32, 42],
];

function drawWordmark(
  ctx: CanvasRenderingContext2D,
  centre: number,
  baseline: number,
  size: number,
): void {
  const text = 'Cash';
  ctx.font = `800 ${size}px ${LATIN}`;
  ctx.direction = 'ltr';
  const textWidth = ctx.measureText(text).width;
  const markWidth = size * 0.84 * 0.98;
  const gap = size * 0.06;
  const startX = centre - (textWidth + gap + markWidth) / 2;

  ctx.fillStyle = COLOR.white;
  ctx.textAlign = 'left';
  ctx.fillText(text, startX, baseline);

  const markHeight = size * 0.84;
  ctx.save();
  ctx.translate(startX + textWidth + gap, baseline - size * 0.78);
  ctx.scale(markWidth / 100, markHeight / 84);
  drawBand(ctx, VIOLET_BAND, COLOR.purpleBright);
  drawBand(ctx, WHITE_BAND, COLOR.white);
  ctx.restore();
}

function drawBand(ctx: CanvasRenderingContext2D, points: [number, number][], fill: string): void {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  // Round the corners the same way the SVG mark does.
  ctx.strokeStyle = fill;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

function drawChevron(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  direction: 1 | -1,
  color: string,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fillStyle = COLOR.white;
  ctx.fill();
  ctx.strokeStyle = COLOR.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-3 * direction, -5);
  ctx.lineTo(3 * direction, 0);
  ctx.lineTo(-3 * direction, 5);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

function drawQr(
  ctx: CanvasRenderingContext2D,
  matrix: ReturnType<typeof createQrMatrix>,
  x: number,
  y: number,
  size: number,
): void {
  const total = size + QR_QUIET_ZONE * 2;
  // The quiet zone has to be actual light pixels, not just padding.
  roundRect(ctx, x, y, total, total, 10);
  ctx.fillStyle = COLOR.white;
  ctx.fill();
  ctx.strokeStyle = COLOR.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  const module = size / matrix.size;
  ctx.fillStyle = COLOR.deep;
  for (let row = 0; row < matrix.size; row += 1) {
    for (let col = 0; col < matrix.size; col += 1) {
      if (!matrix.isDark(col, row)) continue;
      // A hair of overdraw closes hairline seams between modules.
      ctx.fillRect(
        x + QR_QUIET_ZONE + col * module,
        y + QR_QUIET_ZONE + row * module,
        module + 0.4,
        module + 0.4,
      );
    }
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

/** True when a string contains Arabic script and so needs RTL layout. */
function hasArabic(value: string): boolean {
  return /[\u0600-\u06FF]/.test(value);
}

/** Shortens text with an ellipsis so a long wallet name cannot overrun. */
function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

/** Convenience wrapper: canvas → PNG blob. */
export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
}

/** Convenience wrapper: canvas → JPEG blob (used by the PDF writer). */
export function canvasToJpegBlob(canvas: HTMLCanvasElement, quality = 0.92): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality));
}

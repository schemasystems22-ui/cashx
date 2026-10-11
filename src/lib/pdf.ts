/**
 * A minimal single-page PDF writer, just enough to wrap an exported receipt.
 *
 * Written by hand rather than pulling in a PDF library: the document we need is
 * one embedded JPEG on one page, which is ~20 lines of PDF structure plus an
 * xref table. Everything is byte-accurate because the xref offsets are computed
 * from the actual byte lengths as the file is assembled.
 *
 * Structure produced:
 *   1 Catalog · 2 Pages · 3 Page · 4 Image (DCTDecode) · 5 Contents
 */

const encoder = new TextEncoder();

/** A4 at 72 dpi, the unit PDF measures in. */
export const A4_POINTS = { width: 595.28, height: 841.89 } as const;

export interface PdfImageOptions {
  /** Raw JPEG bytes, as produced by `canvas.toBlob(…, 'image/jpeg')`. */
  jpeg: Uint8Array;
  /** Pixel dimensions of the JPEG, needed for the image XObject. */
  pixelWidth: number;
  pixelHeight: number;
  /** Page size in points. Defaults to A4. */
  pageWidth?: number;
  pageHeight?: number;
  /** Margin in points, kept white around the receipt. */
  margin?: number;
}

/**
 * Builds a one-page PDF with the image scaled to fit inside the margins.
 *
 * Returns bytes rather than a `Blob` so it can be asserted on directly in tests
 * and wrapped by the caller as `application/pdf`.
 */
export function buildPdfFromJpeg(options: PdfImageOptions): Uint8Array {
  const {
    jpeg,
    pixelWidth,
    pixelHeight,
    pageWidth = A4_POINTS.width,
    pageHeight = A4_POINTS.height,
    margin = 36,
  } = options;

  // Fit the image inside the printable area, preserving aspect ratio.
  const maxWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - margin * 2;
  const fit = Math.min(maxWidth / pixelWidth, maxHeight / pixelHeight);
  const drawWidth = pixelWidth * fit;
  const drawHeight = pixelHeight * fit;
  const x = (pageWidth - drawWidth) / 2;
  const y = (pageHeight - drawHeight) / 2;

  const content = `q\n${round(drawWidth)} 0 0 ${round(drawHeight)} ${round(x)} ${round(y)} cm\n/Im0 Do\nQ`;

  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;

  const push = (data: Uint8Array | string) => {
    const bytes = typeof data === 'string' ? encoder.encode(data) : data;
    chunks.push(bytes);
    length += bytes.length;
  };

  const startObject = (index: number) => {
    offsets[index] = length;
    push(`${index} 0 obj\n`);
  };

  push('%PDF-1.4\n');
  // A binary comment marks the file as binary for tools that sniff the type.
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  startObject(1);
  push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  startObject(2);
  push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  startObject(3);
  push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${round(pageWidth)} ${round(pageHeight)}] ` +
      '/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
  );

  startObject(4);
  push(
    `<< /Type /XObject /Subtype /Image /Width ${pixelWidth} /Height ${pixelHeight} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\n` +
      'stream\n',
  );
  push(jpeg);
  push('\nendstream\nendobj\n');

  startObject(5);
  push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);

  const xrefOffset = length;
  const objectCount = 6; // 0 (free) + the five above

  let xref = `xref\n0 ${objectCount}\n0000000000 65535 f \n`;
  for (let index = 1; index < objectCount; index += 1) {
    xref += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  push(xref);

  push(
    `trailer\n<< /Size ${objectCount} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  );

  const out = new Uint8Array(length);
  let cursor = 0;
  for (const chunk of chunks) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }
  return out;
}

/** PDF numbers must not be exponential or over-long. */
function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Reads back the xref table this writer produced, resolving each entry to the
 * header it points at. Used by the tests to prove the offsets are correct — a
 * wrong offset yields a PDF that silently fails to open.
 */
export function readXrefEntries(pdf: Uint8Array): { index: number; offset: number; header: string }[] {
  const text = new TextDecoder('latin1').decode(pdf);
  const startxref = Number(text.slice(text.lastIndexOf('startxref') + 9).trim().split(/\s/)[0]);
  const table = text.slice(startxref);
  const entries: { index: number; offset: number; header: string }[] = [];

  for (const match of table.matchAll(/^(\d{10}) (\d{5}) (n|f) $/gm)) {
    const offset = Number(match[1]);
    if (match[3] !== 'n') continue;
    entries.push({
      index: entries.length + 1,
      offset,
      header: text.slice(offset, offset + 20).split('\n')[0],
    });
  }
  return entries;
}

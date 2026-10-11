import { describe, expect, it } from 'vitest';
import { A4_POINTS, buildPdfFromJpeg, readXrefEntries } from './pdf';

/**
 * A tiny but genuinely well-formed JPEG: SOI, APP0 "JFIF", EOI. `DCTDecode`
 * hands these bytes straight to the reader, so the writer must not touch them.
 */
const JPEG = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
  0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
]);

const decode = (bytes: Uint8Array) => new TextDecoder('latin1').decode(bytes);

function build(overrides: Partial<Parameters<typeof buildPdfFromJpeg>[0]> = {}) {
  return buildPdfFromJpeg({
    jpeg: JPEG,
    pixelWidth: 950,
    pixelHeight: 1781,
    ...overrides,
  });
}

describe('buildPdfFromJpeg — file envelope', () => {
  it('starts with a PDF header', () => {
    expect(decode(build()).startsWith('%PDF-1.4')).toBe(true);
  });

  it('marks the file as binary with a comment after the header', () => {
    // `%PDF-1.4\n` is nine bytes, so the marker comment begins at index 9.
    const bytes = build();
    expect(bytes[9]).toBe(0x25); // '%'
    expect(bytes[10]).toBeGreaterThan(127); // high byte of the binary marker
  });

  it('ends with the end-of-file marker and a trailing newline', () => {
    expect(decode(build()).endsWith('%%EOF\n')).toBe(true);
  });

  it('declares a startxref pointing at the xref table', () => {
    const text = decode(build());
    const pointer = Number(text.slice(text.lastIndexOf('startxref') + 9).trim().split(/\s/)[0]);
    expect(text.slice(pointer, pointer + 4)).toBe('xref');
  });
});

describe('buildPdfFromJpeg — object graph', () => {
  it('writes five objects plus the free entry', () => {
    const text = decode(build());
    expect(text).toContain('/Type /Catalog');
    expect(text).toContain('/Type /Pages');
    expect(text).toContain('/Type /Page ');
    expect(text).toContain('/Subtype /Image');
    expect(text).toMatch(/\/Size 6/);
  });

  it('resolves every xref offset to the object header it claims', () => {
    // This is the assertion that matters: a wrong offset yields a file that
    // silently refuses to open, and nothing else in the bytes would reveal it.
    const entries = readXrefEntries(build());
    expect(entries).toHaveLength(5);
    entries.forEach((entry, index) => {
      expect(entry.header).toBe(`${index + 1} 0 obj`);
    });
  });

  it('keeps the offsets strictly increasing', () => {
    const offsets = readXrefEntries(build()).map((entry) => entry.offset);
    expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
  });

  it('declares the page as one A4 page', () => {
    const text = decode(build());
    expect(text).toContain(`/MediaBox [0 0 ${A4_POINTS.width} ${A4_POINTS.height}]`);
    expect(text).toContain('/Count 1');
  });

  it('custom page sizes are honoured', () => {
    const text = decode(build({ pageWidth: 300, pageHeight: 400 }));
    expect(text).toContain('/MediaBox [0 0 300 400]');
  });
});

describe('buildPdfFromJpeg — embedded image', () => {
  it('embeds the JPEG untouched with a DCTDecode filter', () => {
    const bytes = build();
    const text = decode(bytes);
    expect(text).toContain('/Filter /DCTDecode');

    const declared = Number(/\/Length (\d+) >>\nstream/.exec(text.slice(text.indexOf('/DCTDecode')))?.[1]);
    expect(declared).toBe(JPEG.length);

    const start = text.indexOf('stream\n', text.indexOf('/DCTDecode')) + 'stream\n'.length;
    const embedded = bytes.slice(start, start + declared);
    expect([...embedded]).toEqual([...JPEG]);
  });

  it('carries the pixel dimensions for the image XObject', () => {
    const text = decode(build());
    expect(text).toContain('/Width 950');
    expect(text).toContain('/Height 1781');
  });

  it('positions the image and paints it from the content stream', () => {
    const text = decode(build());
    expect(text).toContain('/Im0 Do');
    expect(text).toMatch(/q\n[\d.]+ 0 0 [\d.]+ [\d.]+ [\d.]+ cm\n\/Im0 Do\nQ/);
  });

  /** The `cm` matrix from the content stream: width, height, x, y. */
  function placement(pageWidth = A4_POINTS.width, pageHeight = A4_POINTS.height) {
    const text = decode(build({ pageWidth, pageHeight }));
    const match = /q\n([\d.]+) 0 0 ([\d.]+) ([\d.]+) ([\d.]+) cm/.exec(text);
    expect(match).not.toBeNull();
    const [, width, height, x, y] = match!.map(Number);
    return { width, height, x, y };
  }

  it('fits the image inside the margins without overflowing the page', () => {
    const { width, height, x, y } = placement();
    expect(width).toBeLessThanOrEqual(A4_POINTS.width);
    expect(height).toBeLessThanOrEqual(A4_POINTS.height);
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(x + width).toBeLessThanOrEqual(A4_POINTS.width + 0.01);
    expect(y + height).toBeLessThanOrEqual(A4_POINTS.height + 0.01);
  });

  it('preserves the aspect ratio of a tall image', () => {
    const { width, height } = placement();
    // The receipt is taller than A4's printable area, so it fills the height.
    expect(height).toBeCloseTo(A4_POINTS.height - 72, 1);
    expect(width / height).toBeCloseTo(950 / 1781, 3);
  });

  it('centres the image horizontally', () => {
    const { width, x } = placement();
    expect(x).toBeCloseTo((A4_POINTS.width - width) / 2, 2);
  });

  it('scales a wide image down to the printable width', () => {
    const text = decode(build({ pixelWidth: 4000, pixelHeight: 1000 }));
    const [, width, height] = /q\n([\d.]+) 0 0 ([\d.]+)/.exec(text)!.map(Number);
    expect(width).toBeCloseTo(A4_POINTS.width - 72, 1);
    expect(width / height).toBeCloseTo(4, 3);
  });
});

/**
 * A second opinion on the hand-written bytes: PDF.js is a real parser, so if it
 * accepts the document the structure is right, not merely plausible.
 */
describe('buildPdfFromJpeg — parsed by PDF.js', () => {
  it('opens as a single A4 page', async () => {
    const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as {
      getDocument: (src: { data: Uint8Array }) => { promise: Promise<unknown> };
    };

    const doc = (await pdfjs.getDocument({ data: build() }).promise) as {
      numPages: number;
      getPage: (page: number) => Promise<{
        view: number[];
        getOperatorList: () => Promise<{ fnArray: number[] }>;
      }>;
      destroy: () => Promise<void>;
    };

    expect(doc.numPages).toBe(1);

    const page = await doc.getPage(1);
    expect(page.view[2]).toBeCloseTo(A4_POINTS.width, 1);
    expect(page.view[3]).toBeCloseTo(A4_POINTS.height, 1);

    const operators = await page.getOperatorList();
    expect(operators.fnArray.length).toBeGreaterThan(0);

    await doc.destroy();
  }, 30_000);

  /*
   * Note: PDF.js deliberately *repairs* a document whose xref offsets are wrong
   * (it warns and re-indexes every object), so it cannot be used to police the
   * xref table — a corrupted file still opens there. The `readXrefEntries`
   * assertions above are what actually guard the offsets, since strict readers
   * (Acrobat, Preview) do not attempt that recovery.
   */
});

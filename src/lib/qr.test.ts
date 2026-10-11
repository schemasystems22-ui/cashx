import { describe, expect, it } from 'vitest';
import { QR_QUIET_ZONE, createQrMatrix, receiptQrPayload } from './qr';

const ID = 'TXN-261011-104512';

describe('receiptQrPayload', () => {
  it('carries the transaction ID verbatim', () => {
    expect(receiptQrPayload(ID)).toBe(ID);
  });

  it('does not wrap or prefix the ID', () => {
    const payload = receiptQrPayload(ID);
    expect(payload).toContain(ID);
    expect(payload).toHaveLength(ID.length);
  });
});

describe('createQrMatrix', () => {
  it('produces a square matrix', () => {
    const matrix = createQrMatrix(ID);
    expect(matrix.size).toBeGreaterThanOrEqual(21);
    expect(Number.isInteger(matrix.size)).toBe(true);
  });

  it('uses a symbol size that is a legal QR version', () => {
    // Every QR version is 21 + 4·(v-1) modules square.
    const { size } = createQrMatrix(ID);
    expect(size).toBe(21 + 4 * Math.floor((size - 21) / 4));
    expect((size - 21) % 4).toBe(0);
  });

  it('picks a version large enough for the ID at 25% error correction', () => {
    // A 16-character ID at EC level Q exceeds version 1 (21×21), so the encoder
    // steps up to version 2. This is the level chosen for photographed receipts.
    expect(createQrMatrix(ID).size).toBe(25);
  });

  it('steps up a version for a longer payload', () => {
    expect(createQrMatrix('TXN-261011-104512-EXTRA-PADDING').size).toBeGreaterThan(
      createQrMatrix(ID).size,
    );
  });

  it('is deterministic', () => {
    const a = createQrMatrix(ID);
    const b = createQrMatrix(ID);
    for (let y = 0; y < a.size; y += 1) {
      for (let x = 0; x < a.size; x += 1) {
        expect(b.isDark(x, y)).toBe(a.isDark(x, y));
      }
    }
  });

  /**
   * A structurally correct QR always carries three finder patterns. Checking the
   * ring structure proves the symbol is well-formed rather than merely present —
   * a mangled matrix would still "render" and fail only at scan time.
   */
  describe('finder patterns', () => {
    const matrix = createQrMatrix(ID);

    const expectFinder = (originX: number, originY: number) => {
      for (let y = 0; y < 7; y += 1) {
        for (let x = 0; x < 7; x += 1) {
          const onOuterRing = x === 0 || y === 0 || x === 6 || y === 6;
          const onInnerRing = x === 1 || y === 1 || x === 5 || y === 5;
          const expected = onOuterRing || !onInnerRing;
          expect(matrix.isDark(originX + x, originY + y)).toBe(expected);
        }
      }
    };

    it('draws one in the top-left corner', () => {
      expectFinder(0, 0);
    });

    it('draws one in the top-right corner', () => {
      expectFinder(matrix.size - 7, 0);
    });

    it('draws one in the bottom-left corner', () => {
      expectFinder(0, matrix.size - 7);
    });

    it('does not repeat the pattern in the bottom-right corner', () => {
      // The fourth corner holds data and alignment modules, never a finder —
      // but its modules are still whatever the encoding needs, so the check is
      // that the *pattern* is absent rather than that a cell is light.
      let matching = 0;
      for (let y = 0; y < 7; y += 1) {
        for (let x = 0; x < 7; x += 1) {
          const onOuterRing = x === 0 || y === 0 || x === 6 || y === 6;
          const onInnerRing = x === 1 || y === 1 || x === 5 || y === 5;
          const finderWouldBe = onOuterRing || !onInnerRing;
          const actual = matrix.isDark(matrix.size - 7 + x, matrix.size - 7 + y);
          if (actual === finderWouldBe) matching += 1;
        }
      }
      expect(matching).toBeLessThan(49);
    });
  });

  it('alternates the timing pattern along row 6 between the finders', () => {
    const matrix = createQrMatrix(ID);
    for (let x = 8; x < matrix.size - 8; x += 1) {
      expect(matrix.isDark(x, 6)).toBe(x % 2 === 0);
    }
  });

  it('reports out-of-range modules as light instead of throwing', () => {
    const matrix = createQrMatrix(ID);
    expect(matrix.isDark(-1, 0)).toBe(false);
    expect(matrix.isDark(0, -1)).toBe(false);
    expect(matrix.isDark(matrix.size, 0)).toBe(false);
    expect(matrix.isDark(0, matrix.size)).toBe(false);
  });

  it('encodes different payloads differently', () => {
    const a = createQrMatrix(ID);
    const b = createQrMatrix('TXN-261011-104513');
    let differences = 0;
    for (let y = 0; y < a.size; y += 1) {
      for (let x = 0; x < a.size; x += 1) {
        if (a.isDark(x, y) !== b.isDark(x, y)) differences += 1;
      }
    }
    expect(differences).toBeGreaterThan(0);
  });

  it('reserves a four-module quiet zone, as the spec requires', () => {
    expect(QR_QUIET_ZONE).toBe(4);
  });
});

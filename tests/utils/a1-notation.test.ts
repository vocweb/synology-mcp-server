/**
 * Unit tests for a1-notation utility.
 */

import { describe, it, expect } from 'vitest';
import {
  columnLetterToIndex,
  indexToColumnLetter,
  parseA1,
  parseRange,
  buildRange,
} from '../../src/utils/a1-notation.js';

describe('columnLetterToIndex', () => {
  it('maps A to 0', () => expect(columnLetterToIndex('A')).toBe(0));
  it('maps Z to 25', () => expect(columnLetterToIndex('Z')).toBe(25));
  it('maps AA to 26', () => expect(columnLetterToIndex('AA')).toBe(26));
  it('maps AB to 27', () => expect(columnLetterToIndex('AB')).toBe(27));
  it('maps AZ to 51', () => expect(columnLetterToIndex('AZ')).toBe(51));
  it('maps BA to 52', () => expect(columnLetterToIndex('BA')).toBe(52));
  it('maps ZZ to 701', () => expect(columnLetterToIndex('ZZ')).toBe(701));
  it('is case-insensitive', () => expect(columnLetterToIndex('a')).toBe(0));
  it('throws for empty string', () => expect(() => columnLetterToIndex('')).toThrow(RangeError));
  it('throws for 3-char string', () =>
    expect(() => columnLetterToIndex('AAA')).toThrow(RangeError));
});

describe('indexToColumnLetter', () => {
  it('maps 0 to A', () => expect(indexToColumnLetter(0)).toBe('A'));
  it('maps 25 to Z', () => expect(indexToColumnLetter(25)).toBe('Z'));
  it('maps 26 to AA', () => expect(indexToColumnLetter(26)).toBe('AA'));
  it('maps 51 to AZ', () => expect(indexToColumnLetter(51)).toBe('AZ'));
  it('maps 52 to BA', () => expect(indexToColumnLetter(52)).toBe('BA'));
  it('maps 701 to ZZ', () => expect(indexToColumnLetter(701)).toBe('ZZ'));
  it('throws for negative index', () => expect(() => indexToColumnLetter(-1)).toThrow(RangeError));
  it('throws for index > 701', () => expect(() => indexToColumnLetter(702)).toThrow(RangeError));
  it('roundtrips with columnLetterToIndex', () => {
    for (const letter of ['A', 'D', 'Z', 'AA', 'BC', 'ZZ']) {
      expect(indexToColumnLetter(columnLetterToIndex(letter))).toBe(letter);
    }
  });
});

describe('parseA1', () => {
  it('parses A1 as col=0, row=0', () => expect(parseA1('A1')).toEqual({ col: 0, row: 0 }));
  it('parses B3 as col=1, row=2', () => expect(parseA1('B3')).toEqual({ col: 1, row: 2 }));
  it('parses Z10 correctly', () => expect(parseA1('Z10')).toEqual({ col: 25, row: 9 }));
  it('parses AA1 as col=26', () => expect(parseA1('AA1')).toEqual({ col: 26, row: 0 }));
  it('is case-insensitive', () => expect(parseA1('b2')).toEqual({ col: 1, row: 1 }));
  it('throws for invalid reference', () => expect(() => parseA1('1A')).toThrow(SyntaxError));
  it('throws for empty string', () => expect(() => parseA1('')).toThrow(SyntaxError));
});

describe('parseRange', () => {
  it('parses a range A1:D20', () =>
    expect(parseRange('A1:D20')).toEqual({
      startCol: 0,
      startRow: 0,
      endCol: 3,
      endRow: 19,
    }));

  it('parses a single-cell range B3', () =>
    expect(parseRange('B3')).toEqual({
      startCol: 1,
      startRow: 2,
      endCol: 1,
      endRow: 2,
    }));

  it('parses a cross-letter range AA1:ZZ100', () => {
    const r = parseRange('AA1:ZZ100');
    expect(r.startCol).toBe(26);
    expect(r.endCol).toBe(701);
    expect(r.startRow).toBe(0);
    expect(r.endRow).toBe(99);
  });

  it('throws for malformed range', () => expect(() => parseRange('A1:B2:C3')).toThrow(SyntaxError));
});

describe('buildRange', () => {
  it('builds A1:B2 for start=A1, rows=2, cols=2', () =>
    expect(buildRange('A1', 2, 2)).toBe('A1:B2'));
  it('builds A3:D5 for start=A3, rows=3, cols=4', () =>
    expect(buildRange('A3', 3, 4)).toBe('A3:D5'));
  it('handles single cell (1×1)', () => expect(buildRange('C5', 1, 1)).toBe('C5:C5'));
});

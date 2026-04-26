/**
 * A1-notation utilities for spreadsheet range parsing.
 * Supports columns A–ZZ (1–702 columns) and arbitrary row numbers.
 */

/** A parsed A1 reference: { col, row } both 0-indexed. */
export interface A1Ref {
  /** 0-indexed column index (A=0, Z=25, AA=26, ...). */
  col: number;
  /** 0-indexed row index (row 1 in A1 notation = index 0). */
  row: number;
}

/** A parsed A1 range. All indices are 0-based. */
export interface A1Range {
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
}

const COL_RE = /^([A-Z]{1,2})(\d+)$/;

/**
 * Convert a column letter string (e.g. "A", "Z", "AA", "ZZ") to a 0-indexed integer.
 * Supports single- and double-letter columns (A–ZZ = 0–701).
 *
 * @param letter - Uppercase column letters, 1–2 chars.
 * @returns 0-indexed column number.
 * @throws {RangeError} When the letter string is empty or longer than 2 chars.
 */
export function columnLetterToIndex(letter: string): number {
  const upper = letter.toUpperCase();
  if (upper.length === 0 || upper.length > 2) {
    throw new RangeError(`Column letter out of supported range: "${letter}"`);
  }
  let result = 0;
  for (let i = 0; i < upper.length; i++) {
    const charCode = upper.charCodeAt(i) - 64; // A=1..Z=26
    result = result * 26 + charCode;
  }
  // Convert from 1-based Excel-style to 0-indexed
  return result - 1;
}

/**
 * Convert a 0-indexed column number to its column letter string.
 * Supports 0–701 (A–ZZ).
 *
 * @param idx - 0-indexed column number.
 * @returns Uppercase column letter string.
 * @throws {RangeError} When idx is out of range.
 */
export function indexToColumnLetter(idx: number): string {
  if (idx < 0 || idx > 701) {
    throw new RangeError(`Column index ${idx} is out of supported range 0–701`);
  }
  // Convert to 1-based
  let n = idx + 1;
  let result = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

/**
 * Parse a single A1 cell reference (e.g. "B3") into a 0-indexed ref.
 *
 * @param ref - A1 cell reference string, e.g. "A1", "ZZ999".
 * @returns 0-indexed col/row object.
 * @throws {SyntaxError} When the reference string is malformed.
 */
export function parseA1(ref: string): A1Ref {
  const match = COL_RE.exec(ref.toUpperCase().trim());
  if (!match) {
    throw new SyntaxError(`Invalid A1 reference: "${ref}"`);
  }
  const col = columnLetterToIndex(match[1] as string);
  const row = parseInt(match[2] as string, 10) - 1; // convert to 0-indexed
  return { col, row };
}

/**
 * Parse an A1-notation range (e.g. "A1:D20") into 0-indexed start/end positions.
 * Also accepts single-cell references like "B3" (start === end).
 *
 * @param range - A1 range string, e.g. "A1:D20" or "B3".
 * @returns Object with startCol, startRow, endCol, endRow (all 0-indexed).
 * @throws {SyntaxError} When the range string is malformed.
 */
export function parseRange(range: string): A1Range {
  const parts = range.trim().split(':');
  if (parts.length === 1) {
    const ref = parseA1(parts[0] as string);
    return { startCol: ref.col, startRow: ref.row, endCol: ref.col, endRow: ref.row };
  }
  if (parts.length === 2) {
    const start = parseA1(parts[0] as string);
    const end = parseA1(parts[1] as string);
    return { startCol: start.col, startRow: start.row, endCol: end.col, endRow: end.row };
  }
  throw new SyntaxError(`Invalid A1 range: "${range}"`);
}

/**
 * Build an A1 range string from a start cell and 2D value dimensions.
 *
 * @param startCell - Top-left cell in A1 notation, e.g. "A1".
 * @param rows - Number of rows.
 * @param cols - Number of columns.
 * @returns A1 range string, e.g. "A1:B3".
 */
export function buildRange(startCell: string, rows: number, cols: number): string {
  const { col, row } = parseA1(startCell);
  const endCol = indexToColumnLetter(col + cols - 1);
  const endRow = row + rows;
  return `${startCell.toUpperCase()}:${endCol}${endRow}`;
}

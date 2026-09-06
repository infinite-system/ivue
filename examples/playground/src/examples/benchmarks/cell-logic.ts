/**
 * Shared, arm-agnostic grid configuration + pure cell logic.
 *
 * Ported from `demo/grid/cell-logic.ts` (the standalone benchmark app) for the
 * docs-embedded version of the grid benchmark — byte-for-byte identical logic,
 * just relocated so the docs theme can import it without a vue-router runtime.
 * The composable arm, the ivue arm and the POJO arm all import THE SAME
 * functions here, so all three models compute identical derived values from
 * identical raw data. The only thing that differs between arms is the
 * reactivity primitive that wraps these pure functions.
 */

/** Grid shape — 40 columns × 2500 rows = 100,000 cells. */
export const COLS = 40;
export const ROWS = 2500;
export const CELL_COUNT = COLS * ROWS; // 100,000

/** The scaled-up option — 40 columns × 25,000 rows = 1,000,000 cells. */
export const ROWS_1M = 25000;

/** Row-windowing geometry (identical for every arm). */
export const ROW_HEIGHT = 28; // px
export const VIEWPORT_HEIGHT = 448; // px → ~16 rows on screen (matches the 960 mounted-DOM-cells figure in RESULTS.md)
export const OVERSCAN = 4; // extra rows above/below the viewport
export const COL_WIDTH = 84; // px per data cell
export const ROWNUM_WIDTH = 64; // px for the row-number gutter
export const SUM_WIDTH = 116; // px for the Σ row-sum column

/** Spreadsheet-style column label: 0→A, 25→Z, 26→AA … */
export function colLabel(columnNumber: number): string {
  let label = '';
  let x = columnNumber + 1;
  while (x > 0) {
    const remainder = (x - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    x = Math.floor((x - 1) / 26);
  }
  return label;
}

const WORDS = ['alpha', 'beta', 'gamma', 'delta', 'omega', 'sigma', 'lorem'];

/**
 * Deterministic initial raw value for a cell — a repeatable mix of numbers
 * (incl. negatives/decimals), blanks and text, so `isNumber`/`cssClass` vary.
 * Same (row,col) → same value for every arm.
 */
export function initialRaw(row: number, col: number): string {
  const seed = row * COLS + col;
  const kind = seed % 7;
  if (kind < 4) {
    const value = ((seed * 2654435761) % 100000) / 100 - 500;
    return (Math.round(value * 100) / 100).toString();
  }
  if (kind === 4) return '';
  return WORDS[seed % WORDS.length];
}

/** Does the raw string parse as a finite number? */
export function isNumberOf(raw: string): boolean {
  const text = raw.trim();
  if (text.length === 0) return false;
  const parsed = Number(text);
  return !Number.isNaN(parsed) && Number.isFinite(parsed);
}

/** The numeric value used by the visible row-sum column (0 for non-numbers). */
export function numericOf(raw: string): number {
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Display string: formatted number, a dot for blanks, or the raw text. */
export function displayOf(
  raw: string,
  isNumber: boolean,
  numeric: number,
): string {
  if (isNumber)
    return numeric.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return raw === '' ? '·' : raw;
}

/** CSS class driven by number-ness and sign. */
export function cssOf(isNumber: boolean, numeric: number): string {
  if (!isNumber) return 'gc-text';
  return numeric < 0 ? 'gc-neg' : numeric > 0 ? 'gc-pos' : 'gc-zero';
}

/** Format a row sum for the Σ column. */
export function fmtSum(sum: number): string {
  return sum.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

/**
 * Shared, arm-agnostic grid configuration + pure cell logic.
 *
 * Both the composable arm and the ivue arm import THE SAME functions here, so
 * the two models compute identical derived values from identical raw data. The
 * ONLY thing that differs between arms is the reactivity primitive that wraps
 * these pure functions (eager `computed()` vs plain getter + one `computed()`).
 */

/** Grid shape — 40 columns × 2500 rows = 100,000 cells. */
export const COLS = 40;
export const ROWS = 2500;
export const CELL_COUNT = COLS * ROWS; // 100,000

/** The scaled-up option — 40 columns × 25,000 rows = 1,000,000 cells. */
export const ROWS_1M = 25000;

/** Row-windowing geometry (identical for every arm). */
export const ROW_HEIGHT = 28; // px
export const VIEWPORT_HEIGHT = 448; // px  → ~16 rows on screen
export const OVERSCAN = 4; // extra rows above/below the viewport
export const COL_WIDTH = 84; // px per data cell
export const ROWNUM_WIDTH = 64; // px for the row-number gutter
export const SUM_WIDTH = 116; // px for the Σ row-sum column

/** Spreadsheet-style column label: 0→A, 25→Z, 26→AA … */
export function colLabel(n: number): string {
  let s = '';
  let x = n + 1;
  while (x > 0) {
    const m = (x - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

const WORDS = ['alpha', 'beta', 'gamma', 'delta', 'omega', 'sigma', 'lorem'];

/**
 * Deterministic initial raw value for a cell — a repeatable mix of numbers
 * (incl. negatives/decimals), blanks and text, so `isNumber`/`cssClass` vary.
 * Same (row,col) → same value for every arm.
 */
export function initialRaw(row: number, col: number): string {
  const seed = row * COLS + col;
  const k = seed % 7;
  if (k < 4) {
    const v = ((seed * 2654435761) % 100000) / 100 - 500;
    return (Math.round(v * 100) / 100).toString();
  }
  if (k === 4) return '';
  return WORDS[seed % WORDS.length];
}

/** Does the raw string parse as a finite number? */
export function isNumberOf(raw: string): boolean {
  const t = raw.trim();
  if (t.length === 0) return false;
  const n = Number(t);
  return !Number.isNaN(n) && Number.isFinite(n);
}

/** The numeric value used by the visible row-sum column (0 for non-numbers). */
export function numericOf(raw: string): number {
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
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
export function fmtSum(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

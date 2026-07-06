/**
 * Shared, arm-agnostic configuration + PURE cell logic for the formula grid.
 *
 * Nothing here is reactive and nothing here imports the parser — these are the
 * plain functions the reactive `FormulaCell` wraps. Keeping them pure means the
 * cell class stays a thin reactivity shell (one `computed()` + plain getters)
 * and the same functions can be unit-reasoned about in isolation.
 */

/** Grid shape — 40 columns × 2,500 rows = 100,000 cells. */
export const COLS = 40;
export const ROWS = 2500;
export const CELL_COUNT = COLS * ROWS; // 100,000

/** The scaled-up option — 40 columns × 25,000 rows = 1,000,000 cells. */
export const ROWS_1M = 25000;

/** Row-windowing geometry (identical to the plain grid demo). */
export const ROW_HEIGHT = 28; // px
export const VIEWPORT_HEIGHT = 448; // px  → ~16 rows on screen
export const OVERSCAN = 4; // extra rows above/below the viewport

/**
 * The running-sum column resets every RUNSUM_BLOCK rows so no dependency chain
 * is thousands of levels deep (a cold read of the bottom of a full-height chain
 * would recurse through the parser thousands of times). A block of 50 keeps the
 * chain shallow while still cascading across ~3 screens when the top is edited.
 */
export const RUNSUM_BLOCK = 50;

/** A value a cell can resolve to. `FormulaError` is detected structurally. */
export type CellValue =
  number | string | boolean | null | { _error?: string; error?: string };

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

/**
 * Deterministic numeric input for a data cell: a repeatable mix of
 * positives/negatives/decimals with ~8% blanks (so `cssClass` and the blank
 * dot vary). Kept purely numeric so the formulas that reference these columns
 * never error on the initial data — text can still be typed in live.
 * Same (row,col) → same value on every build.
 */
export function numData(row: number, col: number): string {
  const seed = row * COLS + col;
  if (seed % 13 === 5) return ''; // ~7.7% blanks
  const v = ((seed * 2654435761) % 100000) / 100 - 500; // −500 … 500
  return (Math.round(v * 100) / 100).toString();
}

/**
 * The literal text every cell starts with — REAL Excel-formula syntax wired so
 * roughly half the grid is cross-referencing formulas and the other half is the
 * numeric source data they read. `row`/`col` are 0-based here; the A1 refs they
 * emit are 1-based.
 *
 * Column map (per row r = row + 1):
 *   A B C D (0-3) input numbers            — the source data
 *   E   (4)  =A+B                          — cross-cell arithmetic
 *   F   (5)  =C-D                           — cross-cell arithmetic
 *   G   (6)  =SUM(A:D)                      — range, exercises onRange
 *   H   (7)  =AVERAGE(A:D)                  — range, exercises onRange
 *   I   (8)  =IF(A>0, B, C)                 — CONDITIONAL dependency (marquee)
 *   J   (9)  =J(r-1)+A  (block-reset)       — running sum (marquee cascade)
 *   K…AN(10+) even col = input, odd col = =<left1>+<left2>  (cross-column mesh)
 */
export function initialFormula(row: number, col: number): string {
  const r = row + 1; // 1-based row for A1 notation
  switch (col) {
    case 0:
    case 1:
    case 2:
    case 3:
      return numData(row, col);
    case 4:
      return `=A${r}+B${r}`;
    case 5:
      return `=C${r}-D${r}`;
    case 6:
      return `=SUM(A${r}:D${r})`;
    case 7:
      return `=AVERAGE(A${r}:D${r})`;
    case 8:
      return `=IF(A${r}>0,B${r},C${r})`;
    case 9:
      // Running sum, reset at the top of each RUNSUM_BLOCK-row block.
      return row % RUNSUM_BLOCK === 0 ? `=A${r}` : `=J${r - 1}+A${r}`;
    default:
      // Filler mesh: even columns are input data; odd columns sum the two
      // cells immediately to their left (one data, one formula) — a real
      // cross-column dependency, not a decorative one.
      if (col % 2 === 0) return numData(row, col);
      return `=${colLabel(col - 1)}${r}+${colLabel(col - 2)}${r}`;
  }
}

/** Does the literal text start (after leading spaces) with '='? */
export function isFormulaText(text: string): boolean {
  const t = text.trimStart();
  return t.length > 0 && t[0] === '=';
}

/** Strip the leading '=' (and any leading spaces) to get the formula body. */
export function stripFormula(text: string): string {
  return text.trimStart().slice(1);
}

/** Structural FormulaError detection — avoids importing the parser here. */
export function isFormulaError(
  value: CellValue,
): value is { _error?: string; error?: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    ('_error' in value || 'error' in value)
  );
}

/**
 * Resolve a NON-formula literal to its value: '' → null (blank, SUMs as 0),
 * a numeric string → a number, anything else → the text verbatim.
 */
export function evalLiteral(text: string): CellValue {
  const t = text.trim();
  if (t.length === 0) return null;
  const n = Number(t);
  return !Number.isNaN(n) && Number.isFinite(n) ? n : text;
}

/** Display string for a resolved value. */
export function displayOf(value: CellValue): string {
  if (value == null) return '·';
  if (isFormulaError(value))
    return String(value.error ?? value._error ?? '#ERR');
  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? value.toLocaleString('en-US', { maximumFractionDigits: 2 })
      : String(value);
  }
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return String(value);
}

/** CSS class driven by error-ness, number sign, and whether it's a formula. */
export function cssOf(value: CellValue, isFormula: boolean): string {
  let base: string;
  if (isFormulaError(value)) base = 'gc-err';
  else if (value == null) base = 'gc-zero';
  else if (typeof value === 'number')
    base = value < 0 ? 'gc-neg' : value > 0 ? 'gc-pos' : 'gc-zero';
  else base = 'gc-text';
  return isFormula ? base + ' gc-formula' : base;
}

/**
 * Pure config + column layout for the flyweight grid. Nothing here is
 * reactive and nothing imports the parser — same division of labor as the
 * formula grid's `formula-logic.ts` (used as reference, not imported).
 *
 * Layout — 20 columns × 1,000,000 rows = 20,000,000 cells, ~55% formulas
 * (matching the formula grid's density story), expressed as per-column
 * PATTERNS so formula sources cost 20 closures instead of 11M strings:
 *
 *   A–D  (0–3)   numeric source data (deterministic, ~7.7% blanks)
 *   E    (4)     =A{r}+B{r}            point arithmetic
 *   F    (5)     =C{r}-D{r}            point arithmetic
 *   G    (6)     =SUM(A{r}:D{r})       small range → fine tier
 *   H    (7)     =IF(A{r}>0,B{r},C{r}) conditional dependency (marquee)
 *   I    (8)     =H{r}*2               formula-on-formula (point)
 *   J    (9)     =J{r-1}+A{r}          running sum, block-reset every 50
 *   K…T  (10–19) even = data, odd = =<left1>{r}+<left2>{r}  (cross mesh)
 */

export const COLS = 20;
export const ROWS_1M = 1_000_000;

/** Rows per coarse invalidation block (2^12). 1M rows → 245 blocks/column. */
export const BLOCK_SHIFT = 12;
export const BLOCK_ROWS = 1 << BLOCK_SHIFT; // 4096

/** Ranges up to this many cells subscribe per-cell (fine tier, precise);
 *  larger ranges subscribe per-block (coarse tier, O(blocks)). */
export const FINE_RANGE_LIMIT = 64;

/** Running-sum reset block — keeps dependency chains shallow (reference:
 *  the formula grid's RUNSUM_BLOCK rationale). */
export const RUNSUM_BLOCK = 50;

/** Row-windowing geometry for the demo UI. */
export const ROW_HEIGHT = 28;
export const VIEWPORT_HEIGHT = 448;
export const OVERSCAN = 4;

/** Cell kind tags in the columnar `kind` array. */
export const enum Kind {
  Blank = 0,
  Number = 1,
  Text = 2,
  Formula = 3,
}

/** A value a cell can resolve to (FormulaError detected structurally). */
export type CellValue =
  number | string | boolean | null | { _error?: string; error?: string };

/** Spreadsheet column label: 0→A, 25→Z, 26→AA … */
export function colLabel(colIndex: number): string {
  let label = '';
  let remaining = colIndex + 1;
  while (remaining > 0) {
    const letterIndex = (remaining - 1) % 26;
    label = String.fromCharCode(65 + letterIndex) + label;
    remaining = Math.floor((remaining - 1) / 26);
  }
  return label;
}

/** Which columns hold numeric source data (the rest are formula patterns). */
export function isDataCol(col: number): boolean {
  if (col <= 3) return true;
  return col >= 10 && col % 2 === 0;
}

/**
 * Deterministic numeric seed for a data cell — NUMERIC (no string round-trip:
 * 9M cells fill straight into Float64Arrays). ~7.7% blanks → null.
 * Same (row,col) → same value on every build.
 */
export function numDataValue(row: number, col: number): number | null {
  const seed = row * COLS + col;
  if (seed % 13 === 5) return null;
  const value = ((seed * 2654435761) % 100000) / 100 - 500; // −500 … 500
  return Math.round(value * 100) / 100;
}

/**
 * The default formula SOURCE for a formula-column cell — generated on
 * demand from the column pattern (row is 0-based; emitted refs are 1-based).
 * Data columns return null (their ground truth lives in the typed arrays).
 */
export function patternSource(row: number, col: number): string | null {
  const r = row + 1;
  switch (col) {
    case 0:
    case 1:
    case 2:
    case 3:
      return null;
    case 4:
      return `=A${r}+B${r}`;
    case 5:
      return `=C${r}-D${r}`;
    case 6:
      return `=SUM(A${r}:D${r})`;
    case 7:
      return `=IF(A${r}>0,B${r},C${r})`;
    case 8:
      return `=H${r}*2`;
    case 9:
      return row % RUNSUM_BLOCK === 0 ? `=A${r}` : `=J${r - 1}+A${r}`;
    default:
      if (col % 2 === 0) return null;
      return `=${colLabel(col - 1)}${r}+${colLabel(col - 2)}${r}`;
  }
}

/** 1-based column index from a spreadsheet label: A→1, Z→26, AA→27 … */
export function colIndexFromLabel(label: string): number {
  let index = 0;
  for (let position = 0; position < label.length; position++)
    index = index * 26 + (label.charCodeAt(position) - 64);
  return index;
}

export interface SimpleAggregate {
  fn: 'SUM' | 'AVERAGE' | 'MIN' | 'MAX' | 'COUNT';
  /** 1-based bounds, parser convention. */
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

const AGG_RE =
  /^\s*(SUM|AVERAGE|MIN|MAX|COUNT)\(\s*([A-Z]+)(\d+)\s*:\s*([A-Z]+)(\d+)\s*\)\s*$/i;

/**
 * Detect a formula body that is EXACTLY one aggregate over one contiguous
 * range — the shape the columnar fast path can compute LINEARLY. Everything
 * else returns null and takes the general parser. This matters because the
 * stock parser's range aggregation is O(n²) in range size (measured: 27ms @
 * 10k cells → 40s @ 200k) — bulk aggregation belongs to the columnar layer.
 */
export function matchSimpleAggregate(body: string): SimpleAggregate | null {
  const match = AGG_RE.exec(body);
  if (!match) return null;
  const fn = match[1].toUpperCase() as SimpleAggregate['fn'];
  const startCol = colIndexFromLabel(match[2].toUpperCase());
  const startRow = parseInt(match[3], 10);
  const endCol = colIndexFromLabel(match[4].toUpperCase());
  const endRow = parseInt(match[5], 10);
  if (startRow < 1 || startCol < 1 || endRow < startRow || endCol < startCol)
    return null;
  return { fn, startRow, startCol, endRow, endCol };
}

/** Does literal text start (after leading spaces) with '='? */
export function isFormulaText(text: string): boolean {
  const trimmed = text.trimStart();
  return trimmed.length > 0 && trimmed[0] === '=';
}

/** Strip the leading '=' to get the formula body. */
export function stripFormula(text: string): string {
  return text.trimStart().slice(1);
}

/** Structural FormulaError detection (no parser import here). */
export function isFormulaError(
  value: CellValue,
): value is { _error?: string; error?: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    ('_error' in value || 'error' in value)
  );
}

/** Resolve a NON-formula literal: '' → null, numeric → number, else text. */
export function evalLiteral(text: string): CellValue {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  const numeric = Number(trimmed);
  return !Number.isNaN(numeric) && Number.isFinite(numeric) ? numeric : text;
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

/** CSS class from error-ness, sign, and formula-ness. */
export function cssOf(value: CellValue, isFormula: boolean): string {
  let base: string;
  if (isFormulaError(value)) base = 'gc-err';
  else if (value == null) base = 'gc-zero';
  else if (typeof value === 'number')
    base = value < 0 ? 'gc-neg' : value > 0 ? 'gc-pos' : 'gc-zero';
  else base = 'gc-text';
  return isFormula ? base + ' gc-formula' : base;
}

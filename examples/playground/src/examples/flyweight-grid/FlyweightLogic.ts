import { Static } from '../../Static';

/**
 * Config, column layout and value mapping for the flyweight grid — a
 * static capability class rather than a bag of exports, so a variant
 * grid EXTENDS it (`class $WideGrid extends FlyweightLogic.$Class`
 * overriding COLS or patternSource) instead of forking the file.
 * Nothing here is reactive and nothing imports the parser — the same
 * division of labor as the formula grid's `FormulaLogic`
 * (reference, not imported).
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
 *
 * HOT PATH: Static()'s bound methods are plain-function speed once
 * read — the only per-call cost is reading the method through the
 * accessor inside a loop. FlyweightSheet's 9,000,000-call seeding loop
 * therefore destructures the methods it needs once
 * (`const { isDataCol, numDataValue } = this.Logic`) — one read of the
 * sheet's overridable Logic seam, so BOTH swap axes are honored: a
 * class swapped into the namespace slot, and a sheet subclass
 * overriding `get Logic()` to route the whole layer elsewhere — and
 * measures at or better than the original module functions (77-82ms vs
 * 89ms for 20M cells, in-browser medians). Ordinary call counts can use
 * `FlyweightLogic.Class.method()` directly and never notice.
 */
class $FlyweightLogic {
  static readonly COLS = 20;
  static readonly ROWS_1M = 1_000_000;

  /** Rows per coarse invalidation block (2^12). 1M rows → 245 blocks/column. */
  static readonly BLOCK_SHIFT = 12;
  static readonly BLOCK_ROWS = 1 << 12; // 4096

  /** Ranges up to this many cells subscribe per-cell (fine tier, precise);
   *  larger ranges subscribe per-block (coarse tier, O(blocks)). */
  static readonly FINE_RANGE_LIMIT = 64;

  /** Running-sum reset block — keeps dependency chains shallow (reference:
   *  the formula grid's RUNSUM_BLOCK rationale). */
  static readonly RUNSUM_BLOCK = 50;

  /** Row-windowing geometry for the demo UI. */
  static readonly ROW_HEIGHT = 28;
  static readonly VIEWPORT_HEIGHT = 448;
  static readonly OVERSCAN = 4;

  protected static readonly AGG_RE =
    /^\s*(SUM|AVERAGE|MIN|MAX|COUNT)\(\s*([A-Z]+)(\d+)\s*:\s*([A-Z]+)(\d+)\s*\)\s*$/i;

  /** Spreadsheet column label: 0→A, 25→Z, 26→AA … */
  static colLabel(colIndex: number): string {
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
  static isDataCol(col: number): boolean {
    if (col <= 3) return true;
    return col >= 10 && col % 2 === 0;
  }

  /**
   * Deterministic numeric seed for a data cell — NUMERIC (no string
   * round-trip: 9M cells fill straight into Float64Arrays). ~7.7% blanks →
   * null. Same (row,col) → same value on every build.
   */
  static numDataValue(row: number, col: number): number | null {
    const seed = row * this.COLS + col;
    if (seed % 13 === 5) return null;
    const value = ((seed * 2654435761) % 100000) / 100 - 500; // −500 … 500
    return Math.round(value * 100) / 100;
  }

  /**
   * The default formula SOURCE for a formula-column cell — generated on
   * demand from the column pattern (row is 0-based; emitted refs are
   * 1-based). Data columns return null (their ground truth lives in the
   * typed arrays).
   */
  static patternSource(row: number, col: number): string | null {
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
        return row % this.RUNSUM_BLOCK === 0 ? `=A${r}` : `=J${r - 1}+A${r}`;
      default:
        if (col % 2 === 0) return null;
        return `=${this.colLabel(col - 1)}${r}+${this.colLabel(col - 2)}${r}`;
    }
  }

  /** 1-based column index from a spreadsheet label: A→1, Z→26, AA→27 … */
  static colIndexFromLabel(label: string): number {
    let index = 0;
    for (let position = 0; position < label.length; position++)
      index = index * 26 + (label.charCodeAt(position) - 64);
    return index;
  }

  /**
   * Detect a formula body that is EXACTLY one aggregate over one contiguous
   * range — the shape the columnar fast path can compute LINEARLY.
   * Everything else returns null and takes the general parser. This matters
   * because the stock parser's range aggregation is O(n²) in range size
   * (measured: 27ms @ 10k cells → 40s @ 200k) — bulk aggregation belongs to
   * the columnar layer.
   */
  static matchSimpleAggregate(
    body: string,
  ): FlyweightLogic.SimpleAggregate | null {
    const match = this.AGG_RE.exec(body);
    if (!match) return null;
    const fn = match[1].toUpperCase() as FlyweightLogic.SimpleAggregate['fn'];
    const startCol = this.colIndexFromLabel(match[2].toUpperCase());
    const startRow = parseInt(match[3], 10);
    const endCol = this.colIndexFromLabel(match[4].toUpperCase());
    const endRow = parseInt(match[5], 10);
    if (startRow < 1 || startCol < 1 || endRow < startRow || endCol < startCol)
      return null;
    return { fn, startRow, startCol, endRow, endCol };
  }

  /** Does literal text start (after leading spaces) with '='? */
  static isFormulaText(text: string): boolean {
    const trimmed = text.trimStart();
    return trimmed.length > 0 && trimmed[0] === '=';
  }

  /** Strip the leading '=' to get the formula body. */
  static stripFormula(text: string): string {
    return text.trimStart().slice(1);
  }

  /** Structural FormulaError detection (no parser import here). */
  static isFormulaError(
    value: FlyweightLogic.CellValue,
  ): value is { _error?: string; error?: string } {
    return (
      typeof value === 'object' &&
      value !== null &&
      ('_error' in value || 'error' in value)
    );
  }

  /** Resolve a NON-formula literal: '' → null, numeric → number, else text. */
  static evalLiteral(text: string): FlyweightLogic.CellValue {
    const trimmed = text.trim();
    if (trimmed.length === 0) return null;
    const numeric = Number(trimmed);
    return !Number.isNaN(numeric) && Number.isFinite(numeric) ? numeric : text;
  }

  /** Display string for a resolved value. */
  static displayOf(value: FlyweightLogic.CellValue): string {
    if (value == null) return '·';
    if (this.isFormulaError(value))
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
  static cssOf(value: FlyweightLogic.CellValue, isFormula: boolean): string {
    let base: string;
    if (this.isFormulaError(value)) base = 'gc-err';
    else if (value == null) base = 'gc-zero';
    else if (typeof value === 'number')
      base = value < 0 ? 'gc-neg' : value > 0 ? 'gc-pos' : 'gc-zero';
    else base = 'gc-text';
    return isFormula ? base + ' gc-formula' : base;
  }
}

export namespace FlyweightLogic {
  /* Identity */

  export const $Class = Static($FlyweightLogic); // raw — children extend this
  export let Class = $Class; // selected — callers read this

  /* Types */

  /** Cell kind tags in the columnar `kind` array. A plain enum, not a
   *  const enum: const enums cannot live in a namespace under
   *  isolatedModules (Vite), and the inlining they buy is noise here. */
  export enum Kind {
    Blank = 0,
    Number = 1,
    Text = 2,
    Formula = 3,
  }

  /** A value a cell can resolve to (FormulaError detected structurally). */
  export type CellValue =
    | number
    | string
    | boolean
    | null
    | { _error?: string; error?: string };

  export interface SimpleAggregate {
    fn: 'SUM' | 'AVERAGE' | 'MIN' | 'MAX' | 'COUNT';
    /** 1-based bounds, parser convention. */
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  }
}

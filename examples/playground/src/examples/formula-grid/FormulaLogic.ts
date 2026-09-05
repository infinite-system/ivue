import { Static } from '../../Static';

/**
 * Configuration + PURE cell logic for the formula grid — a static
 * capability class, so a variant grid EXTENDS it (`class $WideGridLogic
 * extends FormulaLogic.$Class` overriding COLS or initialFormula) instead
 * of forking a file of functions.
 *
 * Nothing here is reactive and nothing here imports the parser — these are
 * the plain operations the reactive `FormulaCell` wraps. Keeping them pure
 * means the cell class stays a thin reactivity shell (one `computed()` +
 * plain getters) and the same operations can be unit-reasoned about in
 * isolation. The Sheet exposes this class through its `Logic` seam, which
 * is the one place a sheet subclass reroutes the whole layer.
 */
class $FormulaLogic {
  /** Grid shape — 40 columns × 2,500 rows = 100,000 cells. */
  static readonly COLS = 40;
  static readonly ROWS = 2500;
  static readonly CELL_COUNT = 40 * 2500; // 100,000

  /** The scaled-up option — 40 columns × 25,000 rows = 1,000,000 cells. */
  static readonly ROWS_1M = 25000;

  /** Row-windowing geometry (identical to the plain grid demo). */
  static readonly ROW_HEIGHT = 28; // px
  static readonly VIEWPORT_HEIGHT = 448; // px  → ~16 rows on screen
  static readonly OVERSCAN = 4; // extra rows above/below the viewport

  /**
   * The running-sum column resets every RUNSUM_BLOCK rows so no dependency
   * chain is thousands of levels deep (a cold read of the bottom of a
   * full-height chain would recurse through the parser thousands of times).
   * A block of 50 keeps the chain shallow while still cascading across ~3
   * screens when the top is edited.
   */
  static readonly RUNSUM_BLOCK = 50;

  /** Spreadsheet-style column label: 0→A, 25→Z, 26→AA … */
  static colLabel(columnIndex: number): string {
    let label = '';
    let remaining = columnIndex + 1;
    while (remaining > 0) {
      const digit = (remaining - 1) % 26;
      label = String.fromCharCode(65 + digit) + label;
      remaining = Math.floor((remaining - 1) / 26);
    }
    return label;
  }

  /**
   * Deterministic numeric input for a data cell: a repeatable mix of
   * positives/negatives/decimals with ~8% blanks (so `cssClass` and the
   * blank dot vary). Kept purely numeric so the formulas that reference
   * these columns never error on the initial data — text can still be typed
   * in live. Same (row,col) → same value on every build.
   */
  static numData(row: number, col: number): string {
    const seed = row * this.COLS + col;
    if (seed % 13 === 5) return ''; // ~7.7% blanks
    const value = ((seed * 2654435761) % 100000) / 100 - 500; // −500 … 500
    return (Math.round(value * 100) / 100).toString();
  }

  /**
   * The literal text every cell starts with — REAL Excel-formula syntax
   * wired so roughly half the grid is cross-referencing formulas and the
   * other half is the numeric source data they read. `row`/`col` are
   * 0-based here; the A1 refs they emit are 1-based.
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
  static initialFormula(row: number, col: number): string {
    const rowNumber = row + 1; // 1-based row for A1 notation
    switch (col) {
      case 0:
      case 1:
      case 2:
      case 3:
        return this.numData(row, col);
      case 4:
        return `=A${rowNumber}+B${rowNumber}`;
      case 5:
        return `=C${rowNumber}-D${rowNumber}`;
      case 6:
        return `=SUM(A${rowNumber}:D${rowNumber})`;
      case 7:
        return `=AVERAGE(A${rowNumber}:D${rowNumber})`;
      case 8:
        return `=IF(A${rowNumber}>0,B${rowNumber},C${rowNumber})`;
      case 9:
        // Running sum, reset at the top of each RUNSUM_BLOCK-row block.
        return row % this.RUNSUM_BLOCK === 0 ? `=A${rowNumber}` : `=J${rowNumber - 1}+A${rowNumber}`;
      default:
        // Filler mesh: even columns are input data; odd columns sum the two
        // cells immediately to their left (one data, one formula) — a real
        // cross-column dependency, not a decorative one.
        if (col % 2 === 0) return this.numData(row, col);
        return `=${this.colLabel(col - 1)}${rowNumber}+${this.colLabel(col - 2)}${rowNumber}`;
    }
  }

  /** Does the literal text start (after leading spaces) with '='? */
  static isFormulaText(text: string): boolean {
    const trimmed = text.trimStart();
    return trimmed.length > 0 && trimmed[0] === '=';
  }

  /** Strip the leading '=' (and any leading spaces) to get the formula body. */
  static stripFormula(text: string): string {
    return text.trimStart().slice(1);
  }

  /** Structural FormulaError detection — avoids importing the parser here. */
  static isFormulaError(
    value: FormulaLogic.CellValue,
  ): value is { _error?: string; error?: string } {
    return (
      typeof value === 'object' &&
      value !== null &&
      ('_error' in value || 'error' in value)
    );
  }

  /**
   * Resolve a NON-formula literal to its value: '' → null (blank, SUMs as
   * 0), a numeric string → a number, anything else → the text verbatim.
   */
  static evalLiteral(text: string): FormulaLogic.CellValue {
    const trimmed = text.trim();
    if (trimmed.length === 0) return null;
    const asNumber = Number(trimmed);
    return !Number.isNaN(asNumber) && Number.isFinite(asNumber)
      ? asNumber
      : text;
  }

  /** Display string for a resolved value. */
  static displayOf(value: FormulaLogic.CellValue): string {
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

  /** CSS class driven by error-ness, number sign, and whether it's a formula. */
  static cssOf(value: FormulaLogic.CellValue, isFormula: boolean): string {
    let base: string;
    if (this.isFormulaError(value)) base = 'gc-err';
    else if (value == null) base = 'gc-zero';
    else if (typeof value === 'number')
      base = value < 0 ? 'gc-neg' : value > 0 ? 'gc-pos' : 'gc-zero';
    else base = 'gc-text';
    return isFormula ? base + ' gc-formula' : base;
  }
}

export namespace FormulaLogic {
  export const $Class = Static($FormulaLogic); // anchor — statics live here
  export let Class = $Class; // selection — a variant grid swaps this

  /** A value a cell can resolve to. `FormulaError` is detected structurally. */
  export type CellValue =
    | number
    | string
    | boolean
    | null
    | { _error?: string; error?: string };
}

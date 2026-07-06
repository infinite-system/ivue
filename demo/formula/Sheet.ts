/**
 * The Sheet — a PLAIN (non-reactive) container that owns the 100,000
 * `FormulaCell` instances and the ONE shared formula parser.
 *
 * The reactivity lives on the cells (each has its own ref + computed); the
 * Sheet is just the structure + the integration seam:
 *
 *   - `grid[r0][c0]` holds the cells, giving an O(1) 1-based `cellAt(row,col)`.
 *   - a SINGLE `FormulaParser` (not one per cell — that would reintroduce the
 *     per-instance allocation this whole design fights) whose `onCell`/`onRange`
 *     hooks read cells' `value.value`. Because those reads happen while a cell's
 *     `value` computed is evaluating, VUE tracks them as real dependencies —
 *     the dependency graph is discovered, never hand-built.
 */
import FormulaParser from 'fast-formula-parser';
import { FormulaCell } from './FormulaCell';
import {
  COLS,
  type CellValue,
  initialFormula,
  stripFormula,
} from './formula-logic';

const { FormulaError } = FormulaParser as unknown as {
  FormulaError: new (error: string, details?: unknown) => CellValue;
};

interface RangeRef {
  from: { row: number; col: number };
  to: { row: number; col: number };
}

export class Sheet {
  readonly rows: number;
  readonly cols: number;
  /** [row0][col0] — the cells, doubling as the O(1) cellAt index. */
  readonly grid: FormulaCell.Instance[][];

  /** ONE parser for the entire sheet, shared by all cells. */
  private readonly parser: FormulaParser;
  /** Recursion guard: a cell re-entered mid-evaluation is a cycle → #REF!. */
  private readonly evaluating = new Set<object>();
  /** When non-null, cellValueAt records every (row,col) read (dep tracing). */
  private tracer: Array<[number, number]> | null = null;

  constructor(rows: number, cols: number = COLS) {
    this.rows = rows;
    this.cols = cols;

    const grid: FormulaCell.Instance[][] = new Array(rows);
    for (let r = 0; r < rows; r++) {
      const rowArr: FormulaCell.Instance[] = new Array(cols);
      for (let c = 0; c < cols; c++) {
        rowArr[c] = new FormulaCell.Class(
          this,
          r + 1,
          c + 1,
          initialFormula(r, c),
        );
      }
      grid[r] = rowArr;
    }
    this.grid = grid;

    this.parser = new FormulaParser({
      onCell: (ref) => this.cellValueAt(ref.row, ref.col),
      onRange: (ref) => this.rangeValues(ref as RangeRef),
    });
  }

  /** O(1) 1-based lookup. Out of bounds → undefined. */
  cellAt(row: number, col: number): FormulaCell.Instance | undefined {
    if (row < 1 || row > this.rows || col < 1 || col > this.cols)
      return undefined;
    return this.grid[row - 1][col - 1];
  }

  /**
   * onCell seam — read the referenced cell's REACTIVE value. The read is
   * tracked by whatever computed is currently evaluating, so editing that cell
   * later invalidates the dependent formula automatically.
   */
  private cellValueAt(row: number, col: number): CellValue {
    if (this.tracer) this.tracer.push([row, col]);
    const cell = this.cellAt(row, col);
    return cell ? cell.value.value : null; // out of bounds / blank → 0 in math
  }

  /** onRange seam — a 2D array of the referenced cells' values. */
  private rangeValues(ref: RangeRef): CellValue[][] {
    const { from, to } = ref;
    const out: CellValue[][] = [];
    for (let r = from.row; r <= to.row; r++) {
      const rowArr: CellValue[] = [];
      for (let c = from.col; c <= to.col; c++)
        rowArr.push(this.cellValueAt(r, c));
      out.push(rowArr);
    }
    return out;
  }

  /**
   * Parse + evaluate a formula body (no leading '='), through the SHARED parser.
   * Called from a cell's `value` computed, so every onCell/onRange read inside
   * becomes a tracked dependency of that computed. Guarded against cycles.
   */
  evaluate(cell: { row: number; col: number }, body: string): CellValue {
    if (body.trim().length === 0) return null; // "=" alone → blank
    if (this.evaluating.has(cell)) return new FormulaError('#REF!'); // circular ref
    this.evaluating.add(cell);
    try {
      return this.parser.parse(body, {
        row: cell.row,
        col: cell.col,
        sheet: 'Sheet1',
      }) as CellValue;
    } catch (e) {
      return e instanceof (FormulaError as unknown as Function)
        ? (e as CellValue)
        : new FormulaError('#ERROR!');
    } finally {
      this.evaluating.delete(cell);
    }
  }

  /**
   * Diagnostic: which cells does (row,col)'s formula CURRENTLY read? Re-parses
   * once outside Vue tracking with the read-tap on. It walks the exact same
   * onCell/onRange path Vue tracks, so the returned set IS the live Vue
   * dependency set for that cell — which is why it visibly SHIFTS when an
   * IF()'s condition crosses a branch boundary.
   */
  traceDeps(row: number, col: number): Array<[number, number]> {
    const cell = this.cellAt(row, col);
    if (!cell || !cell.isFormula) return [];
    const body = stripFormula(cell.raw.value);
    if (body.trim().length === 0) return [];

    const prev = this.tracer;
    this.tracer = [];
    try {
      this.parser.parse(body, { row, col, sheet: 'Sheet1' });
    } catch {
      /* keep whatever reads it made before erroring */
    }
    const recorded = this.tracer;
    this.tracer = prev;

    const seen = new Set<string>();
    const deps: Array<[number, number]> = [];
    for (const [r, c] of recorded) {
      const k = r + ',' + c;
      if (!seen.has(k)) {
        seen.add(k);
        deps.push([r, c]);
      }
    }
    return deps;
  }

  /** Iterate every cell — the measurement harness uses this to force full
   *  materialization of all cells for the worst-case heap figure. */
  forEach(fn: (cell: FormulaCell.Instance) => void) {
    for (let r = 0; r < this.rows; r++) {
      const rowArr = this.grid[r];
      for (let c = 0; c < this.cols; c++) fn(rowArr[c]);
    }
  }
}

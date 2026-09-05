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
 *   - `Logic` — the pure-logic seam. Every cell and every seeding call reads
 *     the logic class through it, so a sheet subclass reroutes the whole
 *     layer with one override.
 */
import FormulaParser from 'fast-formula-parser';
import { Static } from '../../Static';
import { FormulaCell } from './FormulaCell';
import { FormulaLogic } from './FormulaLogic';

class $Sheet {
  /** The parser's error class, read off the parser module once per class —
   *  a static so a subclass can substitute the error shape it evaluates to. */
  protected static get $FormulaError() {
    return (
      FormulaParser as unknown as {
        FormulaError: new (error: string, details?: unknown) => FormulaLogic.CellValue;
      }
    ).FormulaError;
  }

  constructor(rows: number, cols: number = FormulaLogic.Class.COLS) {
    this.rows = rows;
    this.cols = cols;

    const { initialFormula } = this.Logic;
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
      onRange: (ref) => this.rangeValues(ref as Sheet.RangeRef),
    });
  }

  // CONSTANTS / CONFIG — set once in the constructor, never mutated.
  readonly rows: number;
  readonly cols: number;
  /** [row0][col0] — the cells, doubling as the O(1) cellAt index. */
  readonly grid: FormulaCell.Instance[][];

  /** ONE parser for the entire sheet, shared by all cells. */
  protected readonly parser: FormulaParser;
  /** Recursion guard: a cell re-entered mid-evaluation is a cycle → #REF!. */
  protected readonly evaluating = new Set<object>();
  /** When non-null, cellValueAt records every (row,col) read (dep tracing). */
  protected tracer: Array<[number, number]> | null = null;

  /** The pure-logic layer this sheet (and its cells) reason with — the
   *  seam a subclass overrides to route the whole layer elsewhere. */
  get Logic() {
    return FormulaLogic.Class;
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $Sheet;
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
  protected cellValueAt(row: number, col: number): FormulaLogic.CellValue {
    if (this.tracer) this.tracer.push([row, col]);
    const cell = this.cellAt(row, col);
    return cell ? cell.value.value : null; // out of bounds / blank → 0 in math
  }

  /** onRange seam — a 2D array of the referenced cells' values. */
  protected rangeValues(ref: Sheet.RangeRef): FormulaLogic.CellValue[][] {
    const { from, to } = ref;
    const out: FormulaLogic.CellValue[][] = [];
    for (let r = from.row; r <= to.row; r++) {
      const rowArr: FormulaLogic.CellValue[] = [];
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
  evaluate(cell: { row: number; col: number }, body: string): FormulaLogic.CellValue {
    if (body.trim().length === 0) return null; // "=" alone → blank
    const FormulaError = this.self.$FormulaError;
    if (this.evaluating.has(cell)) return new FormulaError('#REF!'); // circular ref
    this.evaluating.add(cell);
    try {
      return this.parser.parse(body, {
        row: cell.row,
        col: cell.col,
        sheet: 'Sheet1',
      }) as FormulaLogic.CellValue;
    } catch (error) {
      return error instanceof (FormulaError as unknown as Function)
        ? (error as FormulaLogic.CellValue)
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
    const body = this.Logic.stripFormula(cell.raw.value);
    if (body.trim().length === 0) return [];

    const previous = this.tracer;
    this.tracer = [];
    try {
      this.parser.parse(body, { row, col, sheet: 'Sheet1' });
    } catch {
      /* keep whatever reads it made before erroring */
    }
    const recorded = this.tracer;
    this.tracer = previous;

    const seen = new Set<string>();
    const deps: Array<[number, number]> = [];
    for (const [r, c] of recorded) {
      const key = r + ',' + c;
      if (!seen.has(key)) {
        seen.add(key);
        deps.push([r, c]);
      }
    }
    return deps;
  }

  /** Iterate every cell — the measurement harness uses this to force full
   *  materialization of all cells for the worst-case heap figure. */
  forEach(visit: (cell: FormulaCell.Instance) => void) {
    for (let r = 0; r < this.rows; r++) {
      const rowArr = this.grid[r];
      for (let c = 0; c < this.cols; c++) visit(rowArr[c]);
    }
  }
}

export namespace Sheet {
  export const $Class = Static($Sheet); // anchor — it declares a static; children `extends` this
  export let Class = $Class; // selection — plain (non-reactive) class, so no Reactive()
  /** Raw-instance type — what cells and the page hold. */
  export type Model = InstanceType<typeof Class>;

  export interface RangeRef {
    from: { row: number; col: number };
    to: { row: number; col: number };
  }
}

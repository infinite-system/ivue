/**
 * FlyweightSheet — 20M cells with NO cell objects at rest.
 *
 * Ground truth is columnar (`kind` Uint8Array + lazily-allocated Float64Array
 * per column + a sparse Map for text/edited-formula sources). Reactivity is a
 * SPARSE OVERLAY that materializes per observation:
 *
 *   - fine tier   — a version ref per OBSERVED cell (rendered / onCell /
 *                   small range). Precise: conditional dependencies shift.
 *   - coarse tier — a version ref per 4,096-row BLOCK, subscribed only by
 *                   LARGE ranges. =SUM(A1:A1000000) costs 245 edges, not 1M.
 *   - formula computeds — cached on demand; each carries ONE sync watcher
 *                   (the derived-write bridge) that bumps its own block when
 *                   its value changes, so coarse subscribers see through
 *                   formulas — including their out-of-range inputs.
 *
 * Writes are O(observers-of-that-cell): update the arrays, bump the fine ref
 * IF IT EXISTS and the block ref IF IT EXISTS (peek-only). A write to a
 * never-observed cell allocates nothing and notifies no one.
 *
 * The dependency graph is still DISCOVERED, never hand-built — the same
 * onCell/onRange seam as the formula grid (reference: demo/formula/Sheet.ts),
 * with the parser reading through this sheet's tracked accessors.
 */
import FormulaParser from 'fast-formula-parser';
import { pauseTracking, resetTracking } from '@vue/reactivity';
import {
  computed,
  ref,
  watch,
  type ComputedRef,
  type Ref,
  type WatchStopHandle,
} from 'vue';
import { Reactive } from '../../../ivue';
import { FlyweightLogic } from '../FlyweightLogic';

const { FormulaError } = FormulaParser as unknown as {
  FormulaError: new (error: string, details?: unknown) => FlyweightLogic.CellValue;
};


class $FlyweightSheet {
  readonly rows: number;
  readonly cols: number;

  // --- ground truth (plain, non-reactive) ---
  protected readonly columns: FlyweightSheet.Column[];

  // --- the sparse reactive overlay (empty until observed) ---
  protected readonly cellVersions = new Map<number, Ref<number>>();
  protected readonly blockVersions = new Map<number, Ref<number>>();
  protected readonly formulaCache = new Map<number, FlyweightSheet.FormulaEntry>();
  protected readonly adHocCache = new Map<string, ComputedRef<FlyweightLogic.CellValue>>();

  /** Blocks per column (fine↔coarse key math). */
  protected readonly blockCount: number;

  /** ONE parser for the whole sheet (reference: formula grid). */
  protected readonly parser: FormulaParser;
  /** Cycle guard — a cell re-entered mid-evaluation is a cycle → #REF!. */
  protected readonly evaluating = new Set<number>();
  /** When non-null, tracked reads record (row,col) — dep tracing. */
  protected tracer: Array<[number, number]> | null = null;

  /** The logic seam. A subclass overrides THIS to swap the whole config/
   *  mapping layer (`protected override get Logic() { return
   *  WideGridLogic.Class }`) — every read below, including the seeding
   *  loop's one-time destructure, follows the override. A single read
   *  costs one tracked getter call; only PER-CALL reads in the 9M-loop
   *  were ever a cost, and the destructure below avoids exactly that. */
  protected get Logic() {
    return FlyweightLogic.Class;
  }

  constructor(rows: number, cols: number = FlyweightLogic.Class.COLS) {
    this.rows = rows;
    this.cols = cols;
    this.blockCount = Math.ceil(rows / this.Logic.BLOCK_ROWS);

    // Hoist the METHODS once for the seeding loop (a late read of the
    // mutable slot, so a subclass swap is still honored). Static()'s
    // bound functions are exactly plain-function speed — the per-call
    // cost is the ACCESSOR, so read it once per method, not 9M times.
    // Measured in-browser on this loop (fresh-page medians):
    //   hoisted bound methods ......... plain-function speed (~30ms/9M)
    //   Logic.method() per call ....... ~85ms/9M (accessor each call)
    const { isDataCol, numDataValue } = this.Logic;

    // Seed the columnar ground truth. Data columns fill Float64Arrays
    // numerically (no string round-trips — this is the whole creation cost);
    // formula columns are a single Uint8Array.fill.
    const columns: FlyweightSheet.Column[] = new Array(cols);
    for (let col = 0; col < cols; col++) {
      const kind = new Uint8Array(rows);
      let numbers: Float64Array | null = null;
      if (isDataCol(col)) {
        numbers = new Float64Array(rows);
        for (let row = 0; row < rows; row++) {
          const value = numDataValue(row, col);
          if (value !== null) {
            kind[row] = FlyweightLogic.Kind.Number;
            numbers[row] = value;
          } // blanks stay FlyweightLogic.Kind.Blank
        }
      } else {
        kind.fill(FlyweightLogic.Kind.Formula);
      }
      columns[col] = { kind, numbers, text: new Map() };
    }
    this.columns = columns;

    this.parser = new FormulaParser({
      onCell: (cellRef) => this.pointValue(cellRef.row, cellRef.col),
      onRange: (rangeRef) => this.rangeValues(rangeRef as FlyweightSheet.RangeRef),
    });
  }

  // --- keys ---
  protected cellKey(row: number, col: number): number {
    return col * this.rows + row;
  }

  protected blockKey(row: number, col: number): number {
    return col * this.blockCount + (row >> this.Logic.BLOCK_SHIFT);
  }

  // --- version-ref plumbing ---
  /** Subscribe the current effect to a cell (get-OR-CREATE — observation). */
  protected trackCell(row: number, col: number): void {
    const cellKey = this.cellKey(row, col);
    let versionRef = this.cellVersions.get(cellKey);
    if (!versionRef) {
      versionRef = ref(0);
      this.cellVersions.set(cellKey, versionRef);
    }
    void versionRef.value;
  }

  /** Subscribe the current effect to a block (get-or-create — observation). */
  protected trackBlock(blockKey: number): void {
    let versionRef = this.blockVersions.get(blockKey);
    if (!versionRef) {
      versionRef = ref(0);
      this.blockVersions.set(blockKey, versionRef);
    }
    void versionRef.value;
  }

  /** Notify a cell's observers — PEEK-ONLY (unobserved cells cost nothing). */
  protected bumpCell(row: number, col: number): void {
    const versionRef = this.cellVersions.get(this.cellKey(row, col));
    if (versionRef) versionRef.value++;
  }

  /** Notify a block's observers — peek-only. */
  protected bumpBlock(row: number, col: number): void {
    const versionRef = this.blockVersions.get(this.blockKey(row, col));
    if (versionRef) versionRef.value++;
  }

  // --- raw reads ---
  /** UNTRACKED ground-truth value (blank→null). No refs, no observation. */
  rawAt(row: number, col: number): FlyweightLogic.CellValue {
    const column = this.columns[col];
    switch (column.kind[row]) {
      case FlyweightLogic.Kind.Number:
        return column.numbers![row];
      case FlyweightLogic.Kind.Text:
        return column.text.get(row) ?? '';
      case FlyweightLogic.Kind.Formula:
        return this.sourceAt(row, col); // raw view of a formula = its source
      default:
        return null;
    }
  }

  /** The literal text of a cell (formula source / number text / text). */
  sourceAt(row: number, col: number): string {
    const column = this.columns[col];
    const override = column.text.get(row);
    if (override !== undefined) return override;
    switch (column.kind[row]) {
      case FlyweightLogic.Kind.Number:
        return String(column.numbers![row]);
      case FlyweightLogic.Kind.Formula:
        return this.Logic.patternSource(row, col) ?? '';
      default:
        return '';
    }
  }

  kindAt(row: number, col: number): FlyweightLogic.Kind {
    return this.columns[col].kind[row] as FlyweightLogic.Kind;
  }

  // --- tracked reads ---
  /**
   * The TRACKED point read — what rendered cells, facades and onCell use.
   * Formula cells resolve through their cached computed (which carries its
   * own fine ref for source edits); everything else takes a fine ref here.
   */
  valueAt(row: number, col: number): FlyweightLogic.CellValue {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null;
    if (this.columns[col].kind[row] === FlyweightLogic.Kind.Formula) {
      return this.formulaValue(row, col).value;
    }
    this.trackCell(row, col);
    return this.rawAt(row, col);
  }

  /** onCell seam (1-based, like the parser). */
  protected pointValue(oneBasedRow: number, oneBasedCol: number): FlyweightLogic.CellValue {
    if (this.tracer) this.tracer.push([oneBasedRow, oneBasedCol]);
    return this.valueAt(oneBasedRow - 1, oneBasedCol - 1);
  }

  /**
   * onRange seam. Small ranges read per-cell (fine tier — precise).
   * Large ranges subscribe BLOCKS, then read ground truth with tracking
   * PAUSED; formula cells inside resolve through their cached computeds
   * (transitive observation, priced) whose derived-write watchers keep the
   * block tier truthful.
   */
  protected rangeValues(range: FlyweightSheet.RangeRef): FlyweightLogic.CellValue[][] {
    const startRow = range.from.row - 1;
    const startCol = range.from.col - 1;
    const endRow = Math.min(range.to.row - 1, this.rows - 1);
    const endCol = Math.min(range.to.col - 1, this.cols - 1);
    const cellCount = (endRow - startRow + 1) * (endCol - startCol + 1);

    if (this.tracer) {
      for (let row = startRow; row <= endRow; row++)
        for (let col = startCol; col <= endCol; col++)
          this.tracer.push([row + 1, col + 1]);
    }

    const values: FlyweightLogic.CellValue[][] = [];

    if (cellCount <= this.Logic.FINE_RANGE_LIMIT) {
      for (let row = startRow; row <= endRow; row++) {
        const rowValues: FlyweightLogic.CellValue[] = [];
        for (let col = startCol; col <= endCol; col++)
          rowValues.push(this.valueAt(row, col));
        values.push(rowValues);
      }
      return values;
    }

    // Coarse tier: subscribe every covered block (tracked), …
    const firstBlock = startRow >> this.Logic.BLOCK_SHIFT;
    const lastBlock = endRow >> this.Logic.BLOCK_SHIFT;
    for (let col = startCol; col <= endCol; col++) {
      for (let block = firstBlock; block <= lastBlock; block++) {
        this.trackBlock(col * this.blockCount + block);
      }
    }

    // …then read with tracking paused (no fine edges from this range).
    pauseTracking();
    try {
      for (let row = startRow; row <= endRow; row++) {
        const rowValues: FlyweightLogic.CellValue[] = [];
        for (let col = startCol; col <= endCol; col++) {
          rowValues.push(
            this.columns[col].kind[row] === FlyweightLogic.Kind.Formula
              ? this.formulaValue(row, col).value
              : this.rawAt(row, col),
          );
        }
        values.push(rowValues);
      }
    } finally {
      resetTracking();
    }
    return values;
  }

  // --- formulas ---
  /**
   * The cached computed for a formula cell — created on first observation.
   * THIN on purpose: the computed and watcher bodies are small pointers to
   * named, directly testable methods on the prototype.
   */
  protected formulaValue(row: number, col: number): ComputedRef<FlyweightLogic.CellValue> {
    const cellKey = this.cellKey(row, col);
    let entry = this.formulaCache.get(cellKey);
    if (!entry) {
      const value = computed<FlyweightLogic.CellValue>(() => this.evaluateCell(row, col));
      const stopBridge = watch(
        value,
        (newValue, oldValue) =>
          this.onFormulaValueChanged(row, col, newValue, oldValue),
        { flush: 'sync' },
      );
      entry = { value, stopBridge };
      this.formulaCache.set(cellKey, entry);
    }
    return entry.value;
  }

  /**
   * The DERIVED-WRITE BRIDGE: when a formula's value changes, bump the
   * cell's block so coarse subscribers invalidate even though the
   * underlying write happened somewhere else entirely.
   */
  protected onFormulaValueChanged(
    row: number,
    col: number,
    newValue: FlyweightLogic.CellValue,
    oldValue: FlyweightLogic.CellValue,
  ): void {
    if (newValue !== oldValue) this.bumpBlock(row, col);
  }

  /** Evaluate a cell by its CURRENT kind (formulas through the parser). */
  protected evaluateCell(row: number, col: number): FlyweightLogic.CellValue {
    // Source edits / kind flips invalidate this computed via the fine ref.
    this.trackCell(row, col);
    const kind = this.columns[col].kind[row];
    if (kind !== FlyweightLogic.Kind.Formula) return this.rawAt(row, col);

    const source = this.sourceAt(row, col);
    const body = this.Logic.stripFormula(source);
    if (body.trim().length === 0) return null;

    const cellKey = this.cellKey(row, col);
    if (this.evaluating.has(cellKey)) return new FormulaError('#REF!');
    this.evaluating.add(cellKey);
    try {
      // COLUMNAR FAST PATH: a bare aggregate over one range is computed
      // linearly over ground truth with the SAME reactive semantics (fine
      // tier small / block tier large, formulas via cached computeds). The
      // general parser's range aggregation is O(n²) in range size —
      // measured 27ms @ 10k cells → 40s @ 200k — so bulk aggregation
      // belongs to the columnar layer, exactly as desktop engines
      // special-case their range ops.
      const aggregate = this.Logic.matchSimpleAggregate(body);
      if (aggregate) return this.fastAggregate(aggregate);
      return this.parser.parse(body, {
        row: row + 1,
        col: col + 1,
        sheet: 'Sheet1',
      }) as FlyweightLogic.CellValue;
    } catch (error) {
      return error instanceof (FormulaError as unknown as Function)
        ? (error as FlyweightLogic.CellValue)
        : new FormulaError('#ERROR!');
    } finally {
      this.evaluating.delete(cellKey);
    }
  }

  /**
   * A live ad-hoc formula over the sheet (the demo's totals bar) — a cached
   * computed evaluating `body` through the same parser/seams, so a large
   * range inside it costs blocks, not cells. Thin: the computed is a pointer
   * to the named, directly testable evaluateAdHocFormula method.
   */
  liveFormula(body: string): ComputedRef<FlyweightLogic.CellValue> {
    let cached = this.adHocCache.get(body);
    if (!cached) {
      cached = computed<FlyweightLogic.CellValue>(() => this.evaluateAdHocFormula(body));
      this.adHocCache.set(body, cached);
    }
    return cached;
  }

  protected evaluateAdHocFormula(body: string): FlyweightLogic.CellValue {
    try {
      const aggregate = this.Logic.matchSimpleAggregate(body);
      if (aggregate) return this.fastAggregate(aggregate);
      return this.parser.parse(body, {
        row: 1,
        col: 1,
        sheet: 'Sheet1',
      }) as FlyweightLogic.CellValue;
    } catch (error) {
      return error instanceof (FormulaError as unknown as Function)
        ? (error as FlyweightLogic.CellValue)
        : new FormulaError('#ERROR!');
    }
  }

  /**
   * Linear aggregation over a range with the same observation semantics as
   * rangeValues: small ranges take fine per-cell tracking, large ranges take
   * block subscriptions + paused reads (formula cells through their cached
   * computeds; the derived-write bridge keeps blocks truthful). Numbers
   * aggregate; blanks/text are skipped (COUNT counts numbers, Excel-style);
   * an error value propagates.
   */
  protected fastAggregate(aggregate: FlyweightLogic.SimpleAggregate): FlyweightLogic.CellValue {
    const startRow = aggregate.startRow - 1;
    const startCol = aggregate.startCol - 1;
    const endRow = Math.min(aggregate.endRow - 1, this.rows - 1);
    const endCol = Math.min(aggregate.endCol - 1, this.cols - 1);
    const cellCount = (endRow - startRow + 1) * (endCol - startCol + 1);
    const isFineTier = cellCount <= this.Logic.FINE_RANGE_LIMIT;

    if (!isFineTier) {
      const firstBlock = startRow >> this.Logic.BLOCK_SHIFT;
      const lastBlock = endRow >> this.Logic.BLOCK_SHIFT;
      for (let col = startCol; col <= endCol; col++) {
        for (let block = firstBlock; block <= lastBlock; block++) {
          this.trackBlock(col * this.blockCount + block);
        }
      }
      pauseTracking();
    }
    try {
      let sum = 0;
      let count = 0;
      let min = Infinity;
      let max = -Infinity;
      for (let col = startCol; col <= endCol; col++) {
        const column = this.columns[col];
        for (let row = startRow; row <= endRow; row++) {
          let cellValue: FlyweightLogic.CellValue;
          if (isFineTier) {
            cellValue = this.valueAt(row, col);
          } else if (column.kind[row] === FlyweightLogic.Kind.Formula) {
            cellValue = this.formulaValue(row, col).value;
          } else {
            cellValue = this.rawAt(row, col);
          }
          if (typeof cellValue === 'number') {
            sum += cellValue;
            count++;
            if (cellValue < min) min = cellValue;
            if (cellValue > max) max = cellValue;
          } else if (this.Logic.isFormulaError(cellValue)) {
            return cellValue; // errors propagate, Excel-style
          }
        }
      }
      switch (aggregate.fn) {
        case 'SUM':
          return sum;
        case 'AVERAGE':
          return count === 0 ? new FormulaError('#DIV/0!') : sum / count;
        case 'COUNT':
          return count;
        case 'MIN':
          return count === 0 ? 0 : min;
        case 'MAX':
          return count === 0 ? 0 : max;
        default:
          return new FormulaError('#VALUE!'); // unreachable — union is exhaustive
      }
    } finally {
      if (!isFineTier) resetTracking();
    }
  }

  // --- writes ---
  /**
   * THE single write path. O(1) storage update + O(observers) notification.
   * Never allocates reactive state (peek-only bumps).
   */
  write(row: number, col: number, input: string): void {
    const column = this.columns[col];
    const trimmed = input.trim();
    if (this.Logic.isFormulaText(input)) {
      column.kind[row] = FlyweightLogic.Kind.Formula;
      column.text.set(row, input);
    } else if (trimmed.length === 0) {
      column.kind[row] = FlyweightLogic.Kind.Blank;
      column.text.delete(row);
    } else {
      const numeric = Number(trimmed);
      if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
        if (!column.numbers) column.numbers = new Float64Array(this.rows);
        column.kind[row] = FlyweightLogic.Kind.Number;
        column.numbers[row] = numeric;
        column.text.delete(row);
      } else {
        column.kind[row] = FlyweightLogic.Kind.Text;
        column.text.set(row, input);
      }
    }
    this.bumpCell(row, col);
    this.bumpBlock(row, col);
  }

  // --- diagnostics ---
  /**
   * Which cells does (row,col)'s formula CURRENTLY read? Re-parses once with
   * the read-tap on — it walks the same onCell/onRange path Vue tracks, so
   * the set IS the live dependency set (and visibly SHIFTS across an IF's
   * branch boundary). 1-based in/out, like the formula grid's traceDeps.
   */
  traceDeps(oneBasedRow: number, oneBasedCol: number): Array<[number, number]> {
    const row = oneBasedRow - 1;
    const col = oneBasedCol - 1;
    if (this.columns[col]?.kind[row] !== FlyweightLogic.Kind.Formula) return [];
    const body = this.Logic.stripFormula(this.sourceAt(row, col));
    if (body.trim().length === 0) return [];

    const previousTracer = this.tracer;
    this.tracer = [];
    pauseTracking();
    try {
      this.parser.parse(body, {
        row: oneBasedRow,
        col: oneBasedCol,
        sheet: 'Sheet1',
      });
    } catch {
      /* keep whatever reads happened before the error */
    } finally {
      resetTracking();
    }
    const recorded = this.tracer;
    this.tracer = previousTracer;

    const seenKeys = new Set<number>();
    const dependencies: Array<[number, number]> = [];
    for (const [row1, col1] of recorded) {
      const dedupeKey = row1 * (this.cols + 1) + col1;
      if (!seenKeys.has(dedupeKey)) {
        seenKeys.add(dedupeKey);
        dependencies.push([row1, col1]);
      }
    }
    return dependencies;
  }

  /** The observation census — the law, measurable. */
  stats() {
    return {
      fineRefs: this.cellVersions.size,
      blockRefs: this.blockVersions.size,
      formulaComputeds: this.formulaCache.size,
      adHocFormulas: this.adHocCache.size,
    };
  }

  /**
   * Release a formula cell's cached computed (stops its derived-write
   * watcher). Production ties this to viewport/refcount eviction — see
   * DESIGN.md honest boundaries.
   */
  releaseFormula(row: number, col: number): void {
    const cellKey = this.cellKey(row, col);
    const entry = this.formulaCache.get(cellKey);
    if (entry) {
      entry.stopBridge();
      this.formulaCache.delete(cellKey);
    }
  }

  /**
   * Viewport-tied eviction: release overlay entries (fine refs + formula
   * computeds) for all rows OUTSIDE [keepStart, keepEnd]. Row-scoped and
   * column-agnostic. Block refs are kept (bounded: ≤ blockCount × cols).
   *
   * SAFETY relies on dependency LOCALITY: a released fine ref / computed
   * must not have live dependents outside the kept range. In this layout
   * the longest dependency reach is the running-sum chain (RUNSUM_BLOCK =
   * 50 rows), so callers must keep a margin ≥ that around the viewport.
   * A production impl replaces this with refcounts; documented boundary.
   *
   * Correctness after release is by re-materialization: the next
   * observation of a released cell creates a fresh ref/computed over the
   * unchanged ground truth.
   */
  evictOutsideRows(keepStart: number, keepEnd: number): number {
    let released = 0;
    for (const [cellKey, entry] of this.formulaCache) {
      const row = cellKey % this.rows;
      if (row < keepStart || row > keepEnd) {
        entry.stopBridge();
        this.formulaCache.delete(cellKey);
        released++;
      }
    }
    for (const cellKey of this.cellVersions.keys()) {
      const row = cellKey % this.rows;
      if (row < keepStart || row > keepEnd) {
        this.cellVersions.delete(cellKey);
        released++;
      }
    }
    return released;
  }

  /** Drop the entire overlay (watchers stopped). Ground truth untouched. */
  releaseAll(): void {
    for (const entry of this.formulaCache.values()) entry.stopBridge();
    this.formulaCache.clear();
    this.cellVersions.clear();
    this.blockVersions.clear();
    this.adHocCache.clear();
  }
}

export namespace FlyweightSheet {
  export const $Class = $FlyweightSheet;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  /* Types */

  export interface RangeRef {
    from: { row: number; col: number };
    to: { row: number; col: number };
  }

  export interface Column {
    kind: Uint8Array;
    /** Allocated on the first numeric write — formula columns never pay. */
    numbers: Float64Array | null;
    /** Sparse: typed text AND user-edited formula sources (pattern overrides). */
    text: Map<number, string>;
  }

  export interface FormulaEntry {
    value: ComputedRef<FlyweightLogic.CellValue>;
    /** Stops the derived-write bridge watcher (see formulaValue). */
    stopBridge: WatchStopHandle;
  }

}

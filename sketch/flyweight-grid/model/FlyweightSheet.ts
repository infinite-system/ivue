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
import { ivueHotUpdate, Reactive } from '../../../lib/Reactive';
import {
  BLOCK_ROWS,
  BLOCK_SHIFT,
  COLS,
  FINE_RANGE_LIMIT,
  Kind,
  isDataCol,
  isFormulaError,
  isFormulaText,
  matchSimpleAggregate,
  numDataValue,
  patternSource,
  stripFormula,
  type CellValue,
  type SimpleAggregate,
} from '../flyweight-logic';

const { FormulaError } = FormulaParser as unknown as {
  FormulaError: new (error: string, details?: unknown) => CellValue;
};

interface RangeRef {
  from: { row: number; col: number };
  to: { row: number; col: number };
}

interface Column {
  kind: Uint8Array;
  /** Allocated on the first numeric write — formula columns never pay. */
  nums: Float64Array | null;
  /** Sparse: typed text AND user-edited formula sources (pattern overrides). */
  text: Map<number, string>;
}

interface FormulaEntry {
  c: ComputedRef<CellValue>;
  stop: WatchStopHandle;
}

class $FlyweightSheet {
  readonly rows: number;
  readonly cols: number;

  // --- ground truth (plain, non-reactive) ---
  private readonly columns: Column[];

  // --- the sparse reactive overlay (empty until observed) ---
  private readonly cellVersions = new Map<number, Ref<number>>();
  private readonly blockVersions = new Map<number, Ref<number>>();
  private readonly formulaCache = new Map<number, FormulaEntry>();

  /** Blocks per column (fine↔coarse key math). */
  private readonly blockCount: number;

  /** ONE parser for the whole sheet (reference: formula grid). */
  private readonly parser: FormulaParser;
  /** Cycle guard — a cell re-entered mid-evaluation is a cycle → #REF!. */
  private readonly evaluating = new Set<number>();
  /** When non-null, tracked reads record (row,col) — dep tracing. */
  private tracer: Array<[number, number]> | null = null;

  constructor(rows: number, cols: number = COLS) {
    this.rows = rows;
    this.cols = cols;
    this.blockCount = Math.ceil(rows / BLOCK_ROWS);

    // Seed the columnar ground truth. Data columns fill Float64Arrays
    // numerically (no string round-trips — this is the whole creation cost);
    // formula columns are a single Uint8Array.fill.
    const columns: Column[] = new Array(cols);
    for (let c = 0; c < cols; c++) {
      const kind = new Uint8Array(rows);
      let nums: Float64Array | null = null;
      if (isDataCol(c)) {
        nums = new Float64Array(rows);
        for (let r = 0; r < rows; r++) {
          const v = numDataValue(r, c);
          if (v !== null) {
            kind[r] = Kind.Number;
            nums[r] = v;
          } // blanks stay Kind.Blank
        }
      } else {
        kind.fill(Kind.Formula);
      }
      columns[c] = { kind, nums, text: new Map() };
    }
    this.columns = columns;

    this.parser = new FormulaParser({
      onCell: (r) => this.pointValue(r.row, r.col),
      onRange: (r) => this.rangeValues(r as RangeRef),
    });
  }

  // ------------------------------------------------------------------ keys

  private key(row: number, col: number): number {
    return col * this.rows + row;
  }

  private blockKey(row: number, col: number): number {
    return col * this.blockCount + (row >> BLOCK_SHIFT);
  }

  // -------------------------------------------------- version-ref plumbing

  /** Subscribe the current effect to a cell (get-OR-CREATE — observation). */
  private trackCell(row: number, col: number): void {
    const k = this.key(row, col);
    let v = this.cellVersions.get(k);
    if (!v) {
      v = ref(0);
      this.cellVersions.set(k, v);
    }
    void v.value;
  }

  /** Subscribe the current effect to a block (get-or-create — observation). */
  private trackBlock(bk: number): void {
    let v = this.blockVersions.get(bk);
    if (!v) {
      v = ref(0);
      this.blockVersions.set(bk, v);
    }
    void v.value;
  }

  /** Notify a cell's observers — PEEK-ONLY (unobserved cells cost nothing). */
  private bumpCell(row: number, col: number): void {
    const v = this.cellVersions.get(this.key(row, col));
    if (v) v.value++;
  }

  /** Notify a block's observers — peek-only. */
  private bumpBlock(row: number, col: number): void {
    const v = this.blockVersions.get(this.blockKey(row, col));
    if (v) v.value++;
  }

  // -------------------------------------------------------------- raw reads

  /** UNTRACKED ground-truth value (blank→null). No refs, no observation. */
  rawAt(row: number, col: number): CellValue {
    const c = this.columns[col];
    switch (c.kind[row]) {
      case Kind.Number:
        return c.nums![row];
      case Kind.Text:
        return c.text.get(row) ?? '';
      case Kind.Formula:
        return this.sourceAt(row, col); // raw view of a formula = its source
      default:
        return null;
    }
  }

  /** The literal text of a cell (formula source / number text / text). */
  sourceAt(row: number, col: number): string {
    const c = this.columns[col];
    const override = c.text.get(row);
    if (override !== undefined) return override;
    switch (c.kind[row]) {
      case Kind.Number:
        return String(c.nums![row]);
      case Kind.Formula:
        return patternSource(row, col) ?? '';
      default:
        return '';
    }
  }

  kindAt(row: number, col: number): Kind {
    return this.columns[col].kind[row] as Kind;
  }

  // ----------------------------------------------------------- tracked reads

  /**
   * The TRACKED point read — what rendered cells, facades and onCell use.
   * Formula cells resolve through their cached computed (which carries its
   * own fine ref for source edits); everything else takes a fine ref here.
   */
  valueAt(row: number, col: number): CellValue {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null;
    if (this.columns[col].kind[row] === Kind.Formula) {
      return this.formulaValue(row, col).value;
    }
    this.trackCell(row, col);
    return this.rawAt(row, col);
  }

  /** onCell seam (1-based, like the parser). */
  private pointValue(row1: number, col1: number): CellValue {
    if (this.tracer) this.tracer.push([row1, col1]);
    return this.valueAt(row1 - 1, col1 - 1);
  }

  /**
   * onRange seam. Small ranges read per-cell (fine tier — precise).
   * Large ranges subscribe BLOCKS, then read ground truth with tracking
   * PAUSED; formula cells inside resolve through their cached computeds
   * (transitive observation, priced) whose derived-write watchers keep the
   * block tier truthful.
   */
  private rangeValues(refRange: RangeRef): CellValue[][] {
    const r1 = refRange.from.row - 1;
    const c1 = refRange.from.col - 1;
    const r2 = Math.min(refRange.to.row - 1, this.rows - 1);
    const c2 = Math.min(refRange.to.col - 1, this.cols - 1);
    const size = (r2 - r1 + 1) * (c2 - c1 + 1);

    if (this.tracer) {
      for (let r = r1; r <= r2; r++)
        for (let c = c1; c <= c2; c++) this.tracer.push([r + 1, c + 1]);
    }

    const out: CellValue[][] = [];

    if (size <= FINE_RANGE_LIMIT) {
      for (let r = r1; r <= r2; r++) {
        const rowArr: CellValue[] = [];
        for (let c = c1; c <= c2; c++) rowArr.push(this.valueAt(r, c));
        out.push(rowArr);
      }
      return out;
    }

    // Coarse tier: subscribe every covered block (tracked), …
    const bFrom = r1 >> BLOCK_SHIFT;
    const bTo = r2 >> BLOCK_SHIFT;
    for (let c = c1; c <= c2; c++) {
      for (let b = bFrom; b <= bTo; b++) {
        this.trackBlock(c * this.blockCount + b);
      }
    }

    // …then read with tracking paused (no fine edges from this range).
    pauseTracking();
    try {
      for (let r = r1; r <= r2; r++) {
        const rowArr: CellValue[] = [];
        for (let c = c1; c <= c2; c++) {
          rowArr.push(
            this.columns[c].kind[r] === Kind.Formula
              ? this.formulaValue(r, c).value
              : this.rawAt(r, c),
          );
        }
        out.push(rowArr);
      }
    } finally {
      resetTracking();
    }
    return out;
  }

  // ------------------------------------------------------------- formulas

  /**
   * The cached computed for a formula cell — created on first observation.
   * The attached sync watcher is the DERIVED-WRITE BRIDGE: when the value
   * changes, bump the cell's block so coarse subscribers invalidate even
   * though the underlying write happened somewhere else entirely.
   */
  private formulaValue(row: number, col: number): ComputedRef<CellValue> {
    const k = this.key(row, col);
    let e = this.formulaCache.get(k);
    if (!e) {
      const c = computed<CellValue>(() => this.evaluateCell(row, col));
      const stop = watch(
        c,
        (nv, ov) => {
          if (nv !== ov) this.bumpBlock(row, col);
        },
        { flush: 'sync' },
      );
      e = { c, stop };
      this.formulaCache.set(k, e);
    }
    return e.c;
  }

  /** Evaluate a cell by its CURRENT kind (formulas through the parser). */
  private evaluateCell(row: number, col: number): CellValue {
    // Source edits / kind flips invalidate this computed via the fine ref.
    this.trackCell(row, col);
    const kind = this.columns[col].kind[row];
    if (kind !== Kind.Formula) return this.rawAt(row, col);

    const src = this.sourceAt(row, col);
    const body = stripFormula(src);
    if (body.trim().length === 0) return null;

    const k = this.key(row, col);
    if (this.evaluating.has(k)) return new FormulaError('#REF!');
    this.evaluating.add(k);
    try {
      // COLUMNAR FAST PATH: a bare aggregate over one range is computed
      // linearly over ground truth with the SAME reactive semantics (fine
      // tier small / block tier large, formulas via cached computeds). The
      // general parser's range aggregation is O(n²) in range size —
      // measured 27ms @ 10k cells → 40s @ 200k — so bulk aggregation
      // belongs to the columnar layer, exactly as desktop engines
      // special-case their range ops.
      const agg = matchSimpleAggregate(body);
      if (agg) return this.fastAggregate(agg);
      return this.parser.parse(body, {
        row: row + 1,
        col: col + 1,
        sheet: 'Sheet1',
      }) as CellValue;
    } catch (err) {
      return err instanceof (FormulaError as unknown as Function)
        ? (err as CellValue)
        : new FormulaError('#ERROR!');
    } finally {
      this.evaluating.delete(k);
    }
  }

  /**
   * A live ad-hoc formula over the sheet (the demo's totals bar) — a cached
   * computed evaluating `body` through the same parser/seams, so a large
   * range inside it costs blocks, not cells.
   */
  private readonly adHoc = new Map<string, ComputedRef<CellValue>>();

  liveFormula(body: string): ComputedRef<CellValue> {
    let c = this.adHoc.get(body);
    if (!c) {
      c = computed<CellValue>(() => {
        try {
          const agg = matchSimpleAggregate(body);
          if (agg) return this.fastAggregate(agg);
          return this.parser.parse(body, {
            row: 1,
            col: 1,
            sheet: 'Sheet1',
          }) as CellValue;
        } catch (err) {
          return err instanceof (FormulaError as unknown as Function)
            ? (err as CellValue)
            : new FormulaError('#ERROR!');
        }
      });
      this.adHoc.set(body, c);
    }
    return c;
  }

  /**
   * Linear aggregation over a range with the same observation semantics as
   * rangeValues: small ranges take fine per-cell tracking, large ranges take
   * block subscriptions + paused reads (formula cells through their cached
   * computeds; the derived-write bridge keeps blocks truthful). Numbers
   * aggregate; blanks/text are skipped (COUNT counts numbers, Excel-style);
   * an error value propagates.
   */
  private fastAggregate(agg: SimpleAggregate): CellValue {
    const r1 = agg.r1 - 1;
    const c1 = agg.c1 - 1;
    const r2 = Math.min(agg.r2 - 1, this.rows - 1);
    const c2 = Math.min(agg.c2 - 1, this.cols - 1);
    const size = (r2 - r1 + 1) * (c2 - c1 + 1);
    const fine = size <= FINE_RANGE_LIMIT;

    if (!fine) {
      const bFrom = r1 >> BLOCK_SHIFT;
      const bTo = r2 >> BLOCK_SHIFT;
      for (let c = c1; c <= c2; c++) {
        for (let b = bFrom; b <= bTo; b++) {
          this.trackBlock(c * this.blockCount + b);
        }
      }
      pauseTracking();
    }
    try {
      let sum = 0;
      let count = 0;
      let min = Infinity;
      let max = -Infinity;
      for (let c = c1; c <= c2; c++) {
        const column = this.columns[c];
        for (let r = r1; r <= r2; r++) {
          let v: CellValue;
          if (fine) {
            v = this.valueAt(r, c);
          } else if (column.kind[r] === Kind.Formula) {
            v = this.formulaValue(r, c).value;
          } else {
            v = this.rawAt(r, c);
          }
          if (typeof v === 'number') {
            sum += v;
            count++;
            if (v < min) min = v;
            if (v > max) max = v;
          } else if (isFormulaError(v)) {
            return v; // errors propagate, Excel-style
          }
        }
      }
      switch (agg.fn) {
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
      if (!fine) resetTracking();
    }
  }

  // --------------------------------------------------------------- writes

  /**
   * THE single write path. O(1) storage update + O(observers) notification.
   * Never allocates reactive state (peek-only bumps).
   */
  write(row: number, col: number, input: string): void {
    const c = this.columns[col];
    const t = input.trim();
    if (isFormulaText(input)) {
      c.kind[row] = Kind.Formula;
      c.text.set(row, input);
    } else if (t.length === 0) {
      c.kind[row] = Kind.Blank;
      c.text.delete(row);
    } else {
      const n = Number(t);
      if (!Number.isNaN(n) && Number.isFinite(n)) {
        if (!c.nums) c.nums = new Float64Array(this.rows);
        c.kind[row] = Kind.Number;
        c.nums[row] = n;
        c.text.delete(row);
      } else {
        c.kind[row] = Kind.Text;
        c.text.set(row, input);
      }
    }
    this.bumpCell(row, col);
    this.bumpBlock(row, col);
  }

  // ----------------------------------------------------------- diagnostics

  /**
   * Which cells does (row,col)'s formula CURRENTLY read? Re-parses once with
   * the read-tap on — it walks the same onCell/onRange path Vue tracks, so
   * the set IS the live dependency set (and visibly SHIFTS across an IF's
   * branch boundary). 1-based in/out, like the formula grid's traceDeps.
   */
  traceDeps(row1: number, col1: number): Array<[number, number]> {
    const row = row1 - 1;
    const col = col1 - 1;
    if (this.columns[col]?.kind[row] !== Kind.Formula) return [];
    const body = stripFormula(this.sourceAt(row, col));
    if (body.trim().length === 0) return [];

    const prev = this.tracer;
    this.tracer = [];
    pauseTracking();
    try {
      this.parser.parse(body, { row: row1, col: col1, sheet: 'Sheet1' });
    } catch {
      /* keep whatever reads happened before the error */
    } finally {
      resetTracking();
    }
    const recorded = this.tracer;
    this.tracer = prev;

    const seen = new Set<number>();
    const deps: Array<[number, number]> = [];
    for (const [r, c] of recorded) {
      const k = r * (this.cols + 1) + c;
      if (!seen.has(k)) {
        seen.add(k);
        deps.push([r, c]);
      }
    }
    return deps;
  }

  /** The observation census — the law, measurable. */
  stats() {
    return {
      fineRefs: this.cellVersions.size,
      blockRefs: this.blockVersions.size,
      formulaComputeds: this.formulaCache.size,
      adHocFormulas: this.adHoc.size,
    };
  }

  /**
   * Release a formula cell's cached computed (stops its derived-write
   * watcher). Production ties this to viewport/refcount eviction — see
   * DESIGN.md honest boundaries.
   */
  releaseFormula(row: number, col: number): void {
    const k = this.key(row, col);
    const e = this.formulaCache.get(k);
    if (e) {
      e.stop();
      this.formulaCache.delete(k);
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
    for (const [k, e] of this.formulaCache) {
      const row = k % this.rows;
      if (row < keepStart || row > keepEnd) {
        e.stop();
        this.formulaCache.delete(k);
        released++;
      }
    }
    for (const k of this.cellVersions.keys()) {
      const row = k % this.rows;
      if (row < keepStart || row > keepEnd) {
        this.cellVersions.delete(k);
        released++;
      }
    }
    return released;
  }

  /** Drop the entire overlay (watchers stopped). Ground truth untouched. */
  releaseAll(): void {
    for (const e of this.formulaCache.values()) e.stop();
    this.formulaCache.clear();
    this.cellVersions.clear();
    this.blockVersions.clear();
    this.adHoc.clear();
  }
}

export namespace FlyweightSheet {
  export const $Class = $FlyweightSheet;
  export const Class = Reactive($FlyweightSheet);
  export type Instance = typeof Class.Instance;
}

if (import.meta.hot) {
  // ivue HMR: edits to this module graft onto the LIVE sheet/cells — the
  // 20M-cell ground truth, observation overlay and scroll position all
  // survive while methods swap. The capability WASM engines structurally
  // lack: their code and their memory die together.
  import.meta.hot.accept((mod) => ivueHotUpdate?.(import.meta.hot, mod));
}

/**
 * Page controller for the flyweight grid, authored per the ivue operating
 * manual. The composition-API version of this logic carried seven
 * `computed()`s; under the doctrine exactly ONE survives (`visibleRows`,
 * render suppression) — every other derivation is a plain getter at zero
 * bytes per instance. The one computed is THIN: its body is a pointer to
 * `buildVisibleRows()`, so window-building logic hot-grafts onto the live
 * page (closures freeze at creation; prototype lookups stay live).
 */
import {
  computed,
  getCurrentScope,
  onMounted,
  onScopeDispose,
  ref,
  shallowRef,
  watch,
  type ComputedRef,
} from 'vue';
import { ivueHotUpdate, Reactive } from '../../lib/Reactive';
import {
  COLS,
  OVERSCAN,
  ROWS_1M,
  ROW_HEIGHT,
  VIEWPORT_HEIGHT,
  colLabel,
  type CellValue,
} from './flyweight-logic';
import { FlyweightCell } from './model/FlyweightCell';
import { FlyweightSheet } from './model/FlyweightSheet';

export interface PageRow {
  row: number;
  cells: FlyweightCell.Instance[];
}

/**
 * Scroll has physical walls: Chrome's compositor does scroll math in
 * FLOAT32 (dead past 2^24 = 16,777,216 px — a 28M px scroller stops at
 * ~row 599,186); Firefox caps element height at ~17.9M px. Cap the
 * physical height under both and map scroll ratio → virtual offset (the
 * scaled scrollbar every big-grid engine uses; ~2.4:1 at 1M rows).
 */
const MAX_SCROLL_HEIGHT = 12_000_000;

/** Eviction margin ≫ the 50-row running-sum reach (dependency locality). */
const EVICT_MARGIN_ROWS = 512;

class $FlyweightGridPage {
  constructor() {
    // Viewport-tied eviction, debounced so a fast flick doesn't thrash.
    // Plain watch: the constructor runs in setup() context, so the
    // component scope owns and stops it on unmount.
    watch(
      () => this.startRow,
      () => this.scheduleEviction(),
    );

    onMounted(() => {
      this.censusTimer = setInterval(() => this.pollCensus(), 500);
      this.installHarness();
    });

    // Timers die with the component (watchers are component-scoped already).
    if (getCurrentScope()) {
      onScopeDispose(() => {
        if (this.censusTimer) clearInterval(this.censusTimer);
        if (this.evictTimer) clearTimeout(this.evictTimer);
      });
    }
  }

  // ------------------------------------------------------------- state
  get sheet() {
    return shallowRef<FlyweightSheet.Instance | null>(null);
  }
  get creationMs() {
    return ref(0);
  }
  get scrollTop() {
    return ref(0);
  }
  /** Template-ref target — destructured by the SFC for ref="scrollEl". */
  get scrollEl() {
    return ref<HTMLElement | null>(null);
  }
  get editing() {
    return ref<{ row: number; col: number } | null>(null);
  }
  get draft() {
    return ref('');
  }
  /** Polled diagnostics, not model state — refreshed on an interval. */
  get census() {
    return ref({
      fineRefs: 0,
      blockRefs: 0,
      formulaComputeds: 0,
      adHocFormulas: 0,
    });
  }

  // --------------------------------------- non-reactive infra (timers)
  private censusTimer: ReturnType<typeof setInterval> | null = null;
  private evictTimer: ReturnType<typeof setTimeout> | null = null;

  // ------------------------------------------------ derived (plain getters)
  get hasModel() {
    return this.sheet.value !== null;
  }
  get modelCells() {
    return this.sheet.value ? this.sheet.value.rows * COLS : 0;
  }
  get naturalHeight() {
    return this.sheet.value ? this.sheet.value.rows * ROW_HEIGHT : 0;
  }
  get totalHeight() {
    return Math.min(this.naturalHeight, MAX_SCROLL_HEIGHT);
  }
  get scrollScale() {
    return this.naturalHeight > this.totalHeight
      ? (this.naturalHeight - VIEWPORT_HEIGHT) /
          (this.totalHeight - VIEWPORT_HEIGHT)
      : 1;
  }
  /** Position in CONTENT space (0 … naturalHeight − viewport). */
  get virtualTop() {
    return this.scrollTop.value * this.scrollScale;
  }
  get startRow() {
    return Math.max(0, Math.floor(this.virtualTop / ROW_HEIGHT) - OVERSCAN);
  }
  get endRow() {
    const visibleCount = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT);
    return this.sheet.value
      ? Math.min(
          this.sheet.value.rows,
          this.startRow + visibleCount + OVERSCAN * 2,
        )
      : 0;
  }
  /** Pin the window band under the physical scroll position (degenerates
   *  to startRow × ROW_HEIGHT when scale = 1). */
  get offsetY() {
    return (
      this.scrollTop.value - (this.virtualTop - this.startRow * ROW_HEIGHT)
    );
  }

  /**
   * The ONLY cell objects in existence — facades for the visible window.
   * The one surgical computed() on this page: without the cache, the
   * 500ms census poll would re-render the component and a plain getter
   * would rebuild ~520 facades per poll; cached, an unchanged window
   * returns the same array instance and the v-for never re-patches.
   */
  get visibleRows(): ComputedRef<PageRow[]> {
    return computed(() => this.buildVisibleRows());
  }

  private buildVisibleRows(): PageRow[] {
    const sheet = this.sheet.value;
    if (!sheet) return [];
    const pageRows: PageRow[] = [];
    for (let row = this.startRow; row < this.endRow; row++) {
      const cells: FlyweightCell.Instance[] = new Array(COLS);
      for (let col = 0; col < COLS; col++)
        cells[col] = new FlyweightCell.Class(sheet, row, col);
      pageRows.push({ row, cells });
    }
    return pageRows;
  }

  /** Live full-column totals (block tier: 245 edges each). liveFormula is
   *  cached on the sheet, so rebuilding this array per render is pointer
   *  work — a plain getter suffices. */
  get totals(): { label: string; total: ComputedRef<CellValue> }[] {
    const sheet = this.sheet.value;
    if (!sheet) return [];
    const lastRow = sheet.rows;
    return [
      {
        label: `SUM(A1:A${lastRow})`,
        total: sheet.liveFormula(`SUM(A1:A${lastRow})`),
      },
      {
        label: `AVERAGE(B1:B${lastRow})`,
        total: sheet.liveFormula(`AVERAGE(B1:B${lastRow})`),
      },
      {
        label: `SUM(D1:D${lastRow})`,
        total: sheet.liveFormula(`SUM(D1:D${lastRow})`),
      },
    ];
  }

  get activeRef() {
    const editing = this.editing.value;
    return editing ? colLabel(editing.col) + (editing.row + 1) : '';
  }
  get activeSource() {
    const editing = this.editing.value;
    return editing && this.sheet.value
      ? this.sheet.value.sourceAt(editing.row, editing.col)
      : '';
  }

  // ------------------------------------------------------------ methods
  createModel() {
    this.editing.value = null;
    const startedAt = performance.now();
    const sheet = new FlyweightSheet.Class(ROWS_1M, COLS);
    this.creationMs.value = performance.now() - startedAt;
    this.sheet.value = sheet;
    this.pollCensus();
    // eslint-disable-next-line no-console
    console.log(
      `[flyweight] created ${(ROWS_1M * COLS).toLocaleString()} cells in ${this.creationMs.value.toFixed(1)}ms`,
    );
  }

  onScroll(event: Event) {
    this.scrollTop.value = (event.target as HTMLElement).scrollTop;
  }

  isEditing(row: number, col: number) {
    const editing = this.editing.value;
    return !!editing && editing.row === row && editing.col === col;
  }

  edit(cell: FlyweightCell.Instance) {
    this.editing.value = { row: cell.row, col: cell.col };
    this.draft.value = cell.source;
  }

  commitEdit() {
    const editing = this.editing.value;
    if (editing && this.sheet.value)
      this.sheet.value.write(editing.row, editing.col, this.draft.value);
    this.editing.value = null;
  }

  pollCensus() {
    const sheet = this.sheet.value;
    if (sheet) this.census.value = sheet.stats();
  }

  scheduleEviction() {
    if (this.evictTimer) clearTimeout(this.evictTimer);
    this.evictTimer = setTimeout(() => {
      const sheet = this.sheet.value;
      if (!sheet) return;
      sheet.evictOutsideRows(
        Math.max(0, this.startRow - EVICT_MARGIN_ROWS),
        this.endRow + EVICT_MARGIN_ROWS,
      );
      this.pollCensus();
    }, 300);
  }

  scrollToRow(row: number) {
    const scrollEl = this.scrollEl.value;
    if (!this.sheet.value || !scrollEl) return;
    const targetPx =
      (row * ROW_HEIGHT - VIEWPORT_HEIGHT / 2) / this.scrollScale;
    const clamped = Math.max(
      0,
      Math.min(targetPx, this.totalHeight - VIEWPORT_HEIGHT),
    );
    scrollEl.scrollTop = clamped;
    this.scrollTop.value = clamped;
  }

  /** Measurement/verification harness (same idea as the reference grids). */
  private installHarness() {
    (window as unknown as { __fw: unknown }).__fw = {
      rows: () => (this.sheet.value ? this.sheet.value.rows : 0),
      cols: COLS,
      createModel: () => this.createModel(),
      hasModel: () => this.hasModel,
      creationMs: () => this.creationMs.value,
      stats: () => (this.sheet.value ? this.sheet.value.stats() : null),
      scrollToRow: (row: number) => this.scrollToRow(row),
      editCell: (row: number, col: number, input: string) =>
        this.sheet.value?.write(row, col, input),
      cellText: (row: number, col: number) => {
        const cellEl = document.querySelector(
          `[data-grid-cell][data-row="${row}"][data-col="${col}"]`,
        );
        return cellEl ? (cellEl.textContent || '').trim() : null;
      },
      cellValue: (row: number, col: number) => {
        const value = this.sheet.value?.valueAt(row, col);
        return value && typeof value === 'object'
          ? String(value)
          : (value ?? null);
      },
      startRow: () => this.startRow,
    };
  }
}

export namespace FlyweightGridPage {
  export const $Class = $FlyweightGridPage;
  export const Class = Reactive($FlyweightGridPage);
  export type Instance = typeof Class.Instance;
}

if (import.meta.hot) {
  // ivue HMR: behavior edits graft onto the live page controller;
  // constructor/state-shape edits remount just this component.
  import.meta.hot.accept((mod) => ivueHotUpdate?.(import.meta.hot, mod));
}

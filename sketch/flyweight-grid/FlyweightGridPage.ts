/**
 * Page controller for the flyweight grid, authored per the ivue operating
 * manual. The composition-API version of this logic carried seven
 * `computed()`s; under the doctrine exactly ONE survives (`visibleRows`,
 * render suppression) — every other derivation is a plain getter at zero
 * bytes per instance.
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
  r: number;
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
      () => {
        if (this.evictTimer) clearTimeout(this.evictTimer);
        this.evictTimer = setTimeout(() => {
          const s = this.sheet.value;
          if (!s) return;
          s.evictOutsideRows(
            Math.max(0, this.startRow - EVICT_MARGIN_ROWS),
            this.endRow + EVICT_MARGIN_ROWS,
          );
          this.pollCensus();
        }, 300);
      },
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
    return ref<{ r: number; c: number } | null>(null);
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
    const visible = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT);
    return this.sheet.value
      ? Math.min(this.sheet.value.rows, this.startRow + visible + OVERSCAN * 2)
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
    return computed(() => {
      const s = this.sheet.value;
      if (!s) return [] as PageRow[];
      const rows: PageRow[] = [];
      for (let r = this.startRow; r < this.endRow; r++) {
        const cells: FlyweightCell.Instance[] = new Array(COLS);
        for (let c = 0; c < COLS; c++)
          cells[c] = new FlyweightCell.Class(s, r, c);
        rows.push({ r, cells });
      }
      return rows;
    });
  }

  /** Live full-column totals (block tier: 245 edges each). liveFormula is
   *  cached on the sheet, so rebuilding this array per render is pointer
   *  work — a plain getter suffices. */
  get totals(): { label: string; c: ComputedRef<CellValue> }[] {
    const s = this.sheet.value;
    if (!s) return [];
    return [
      { label: `SUM(A1:A${s.rows})`, c: s.liveFormula(`SUM(A1:A${s.rows})`) },
      {
        label: `AVERAGE(B1:B${s.rows})`,
        c: s.liveFormula(`AVERAGE(B1:B${s.rows})`),
      },
      { label: `SUM(D1:D${s.rows})`, c: s.liveFormula(`SUM(D1:D${s.rows})`) },
    ];
  }

  get activeRef() {
    const e = this.editing.value;
    return e ? colLabel(e.c) + (e.r + 1) : '';
  }
  get activeSource() {
    const e = this.editing.value;
    return e && this.sheet.value ? this.sheet.value.sourceAt(e.r, e.c) : '';
  }

  // ------------------------------------------------------------ methods
  createModel() {
    this.editing.value = null;
    const t0 = performance.now();
    const s = new FlyweightSheet.Class(ROWS_1M, COLS);
    this.creationMs.value = performance.now() - t0;
    this.sheet.value = s;
    this.pollCensus();
    // eslint-disable-next-line no-console
    console.log(
      `[flyweight] created ${(ROWS_1M * COLS).toLocaleString()} cells in ${this.creationMs.value.toFixed(1)}ms`,
    );
  }

  onScroll(e: Event) {
    this.scrollTop.value = (e.target as HTMLElement).scrollTop;
  }

  isEditing(r: number, c: number) {
    const e = this.editing.value;
    return !!e && e.r === r && e.c === c;
  }

  edit(cell: FlyweightCell.Instance) {
    this.editing.value = { r: cell.row, c: cell.col };
    this.draft.value = cell.source;
  }

  commitEdit() {
    const e = this.editing.value;
    if (e && this.sheet.value)
      this.sheet.value.write(e.r, e.c, this.draft.value);
    this.editing.value = null;
  }

  pollCensus() {
    const s = this.sheet.value;
    if (s) this.census.value = s.stats();
  }

  scrollToRow(r: number) {
    const el = this.scrollEl.value;
    if (!this.sheet.value || !el) return;
    const px = (r * ROW_HEIGHT - VIEWPORT_HEIGHT / 2) / this.scrollScale;
    const clamped = Math.max(
      0,
      Math.min(px, this.totalHeight - VIEWPORT_HEIGHT),
    );
    el.scrollTop = clamped;
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
      scrollToRow: (r: number) => this.scrollToRow(r),
      editCell: (r: number, c: number, v: string) =>
        this.sheet.value?.write(r, c, v),
      cellText: (r: number, c: number) => {
        const el = document.querySelector(
          `[data-grid-cell][data-row="${r}"][data-col="${c}"]`,
        );
        return el ? (el.textContent || '').trim() : null;
      },
      cellValue: (r: number, c: number) => {
        const v = this.sheet.value?.valueAt(r, c);
        return v && typeof v === 'object' ? String(v) : (v ?? null);
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

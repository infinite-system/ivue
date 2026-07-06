/**
 * Shared page controller for the reactive arms (composable + ivue).
 *
 * Everything that must be IDENTICAL between the two arms lives here: the model
 * container (a `shallowRef` so the array/instances are NEVER deep-proxied — that
 * would corrupt the memory comparison), model creation + timing, row windowing,
 * click-to-edit state, the row-sum reader, and the `window.__grid` measurement
 * harness. The only per-arm difference is the `makeRow` factory passed in and
 * the `.value` placement in each SFC's cell template.
 */
import { computed, onMounted, ref, shallowRef } from 'vue';
import {
  COLS,
  OVERSCAN,
  ROW_HEIGHT,
  ROWS,
  VIEWPORT_HEIGHT,
  colLabel,
  fmtSum,
} from './cell-logic';
import { useRowWindow } from './useRowWindow';

/** Minimal shape both the composable cell and the ivue cell satisfy. */
export interface ReactiveCellLike {
  raw: { value: string };
  numericValue: { value: number };
  touch(): void;
}

export function useGridPage<T extends ReactiveCellLike>(
  arm: string,
  makeRow: (row: number, col: number) => T,
) {
  const model = shallowRef<T[][]>([]);
  const hasModel = ref(false);
  const creationMs = ref(0);

  const scrollEl = ref<HTMLElement | null>(null);

  const win = useRowWindow({
    rowCount: () => model.value.length,
    rowHeight: ROW_HEIGHT,
    viewportHeight: VIEWPORT_HEIGHT,
    overscan: OVERSCAN,
  });

  /** Count of cell nodes currently mounted in the DOM (viewport-sized). */
  const mountedCells = computed(() => win.visibleRows.value.length * COLS);

  /** Build the whole model up front and time ONLY the instance creation. */
  function createModel(rowCount: number = ROWS) {
    const t0 = performance.now();
    const rows: T[][] = new Array(rowCount);
    for (let r = 0; r < rowCount; r++) {
      const row: T[] = new Array(COLS);
      for (let c = 0; c < COLS; c++) row[c] = makeRow(r, c);
      rows[r] = row;
    }
    const t1 = performance.now();
    creationMs.value = t1 - t0;
    model.value = rows;
    hasModel.value = true;
    // eslint-disable-next-line no-console
    console.log(
      `[grid:${arm}] created ${rowCount * COLS} cells in ${creationMs.value.toFixed(2)}ms`,
    );
  }

  /** The visible row-sum: reads the hot numericValue computed of every cell. */
  function rowSum(r: number): number {
    const row = model.value[r];
    if (!row) return 0;
    let s = 0;
    for (let c = 0; c < row.length; c++) s += row[c].numericValue.value;
    return s;
  }

  // --- click-to-edit ---
  const editing = ref<{ r: number; c: number } | null>(null);
  const isEditing = (r: number, c: number) =>
    !!editing.value && editing.value.r === r && editing.value.c === c;
  const edit = (r: number, c: number) => {
    editing.value = { r, c };
  };
  const commitEdit = () => {
    editing.value = null;
  };

  // --- programmatic drivers used by the measurement harness ---
  function setScroll(px: number) {
    const max = Math.max(0, win.totalHeight.value - VIEWPORT_HEIGHT);
    const clamped = Math.min(Math.max(0, px), max);
    win.scrollTop.value = clamped;
    if (scrollEl.value) scrollEl.value.scrollTop = clamped;
  }
  function editCell(r: number, c: number, v: string) {
    const row = model.value[r];
    if (row && row[c]) row[c].raw.value = v;
  }
  function materializeAll() {
    const t0 = performance.now();
    const m = model.value;
    for (let r = 0; r < m.length; r++) {
      const row = m[r];
      for (let c = 0; c < row.length; c++) row[c].touch();
    }
    // eslint-disable-next-line no-console
    console.log(
      `[grid:${arm}] materialized all cells in ${(performance.now() - t0).toFixed(2)}ms`,
    );
  }

  onMounted(() => {
    (window as any).__grid = {
      arm,
      cols: COLS,
      createModel: (rowCount?: number) => createModel(rowCount),
      hasModel: () => hasModel.value,
      creationMs: () => creationMs.value,
      mountedCount: () => document.querySelectorAll('[data-grid-cell]').length,
      scrollToRow: (r: number) =>
        setScroll(r * ROW_HEIGHT - VIEWPORT_HEIGHT / 2),
      setScroll,
      editCell,
      materializeAll,
      cellText: (r: number, c: number) => {
        const el = document.querySelector(
          `[data-grid-cell][data-row="${r}"][data-col="${c}"]`,
        );
        return el ? (el.textContent || '').trim() : null;
      },
      rowSumText: (r: number) => {
        const el = document.querySelector(`[data-rowsum="${r}"]`);
        return el ? (el.textContent || '').trim() : null;
      },
    };
  });

  return {
    // config
    COLS,
    colLabel,
    fmtSum,
    // state
    model,
    hasModel,
    creationMs,
    mountedCells,
    // windowing
    scrollEl,
    totalHeight: win.totalHeight,
    offsetY: win.offsetY,
    visibleRows: win.visibleRows,
    onScroll: win.onScroll,
    // interaction
    editing,
    isEditing,
    edit,
    commitEdit,
    rowSum,
    createModel,
  };
}

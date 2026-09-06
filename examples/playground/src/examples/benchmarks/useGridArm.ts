/**
 * Per-arm grid controller for the docs-embedded benchmark widget.
 *
 * Adapted from `demo/grid/useGridPage.ts` for a DIFFERENT constraint: the
 * standalone demo runs one arm per routed page, so it could register a
 * single `window.__grid` measurement hook in `onMounted`. The docs page
 * embeds all three arms in ONE component at once (see `GridBenchmark.vue`),
 * so three independent controllers must NOT collide on a shared global — that
 * hook is dropped here entirely (it exists only for `demo/grid/measure.mjs`'s
 * Playwright harness, which drives the standalone app, not the docs site).
 *
 * Generalized over a `readNumeric` accessor so the SAME controller shape
 * serves the two reactive arms (ivue, composable — via `cell.numericValue.value`)
 * and the non-reactive POJO arm (via the pure `numericOf(cell.raw)` function),
 * which is what lets `GridBenchmark.vue` drive all three arms through one
 * uniform interface.
 */
import { computed, ref, shallowRef } from 'vue';
import {
  COLS,
  OVERSCAN,
  ROW_HEIGHT,
  ROWS,
  VIEWPORT_HEIGHT,
} from './cell-logic';
import { useRowWindow } from './useRowWindow';

export function useGridArm<T>(
  makeRow: (row: number, col: number) => T,
  readNumeric: (cell: T) => number,
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

  /** Total cells in the current model (0 before creation). */
  const modelCells = computed(() => model.value.length * COLS);

  /**
   * Build the whole model up front and time ONLY the instance creation.
   * Re-clickable: creating again simply replaces the model (old one is
   * GC'd), so the reader can switch between the 100k and 1M sizes live.
   */
  function createModel(rowCount: number = ROWS) {
    editing.value = null;
    const t0 = performance.now();
    const rows: T[][] = new Array(rowCount);
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
      const row: T[] = new Array(COLS);
      for (let columnIndex = 0; columnIndex < COLS; columnIndex++) row[columnIndex] = makeRow(rowIndex, columnIndex);
      rows[rowIndex] = row;
    }
    creationMs.value = performance.now() - t0;
    model.value = rows;
    hasModel.value = true;
  }

  /** The visible row-sum: reads the hot derived numeric value of every cell. */
  function rowSum(rowIndex: number): number {
    const row = model.value[rowIndex];
    if (!row) return 0;
    let sum = 0;
    for (let columnIndex = 0; columnIndex < row.length; columnIndex++) sum += readNumeric(row[columnIndex]);
    return sum;
  }

  // --- click-to-edit ---
  const editing = ref<{ rowIndex: number; columnIndex: number } | null>(null);
  const isEditing = (rowIndex: number, columnIndex: number) =>
    !!editing.value && editing.value.rowIndex === rowIndex && editing.value.columnIndex === columnIndex;
  const edit = (rowIndex: number, columnIndex: number) => {
    editing.value = { rowIndex, columnIndex };
  };
  const commitEdit = () => {
    editing.value = null;
  };

  function setScroll(px: number) {
    const max = Math.max(0, win.totalHeight.value - VIEWPORT_HEIGHT);
    const clamped = Math.min(Math.max(0, px), max);
    win.scrollTop.value = clamped;
    if (scrollEl.value) scrollEl.value.scrollTop = clamped;
  }

  return {
    // config
    COLS,
    // state
    model,
    hasModel,
    creationMs,
    mountedCells,
    modelCells,
    // windowing
    scrollEl,
    totalHeight: win.totalHeight,
    offsetY: win.offsetY,
    visibleRows: win.visibleRows,
    onScroll: win.onScroll,
    setScroll,
    // interaction
    editing,
    isEditing,
    edit,
    commitEdit,
    rowSum,
    createModel,
  };
}

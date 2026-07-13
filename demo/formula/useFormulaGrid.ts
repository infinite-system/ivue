/**
 * Page controller for the formula grid. Mirrors the plain grid demo's
 * `useGridPage`, adapted for the `Sheet` model:
 *
 *   - the Sheet is held in a `shallowRef` so neither it, its `grid`, nor its
 *     100k cells are ever deep-proxied (that would corrupt the heap comparison);
 *     per-cell reactivity comes entirely from each cell's own ref/computed.
 *   - identical row-windowing (`useRowWindow`), click-to-edit, and a
 *     `window.__grid` harness the Playwright measurement script drives —
 *     extended with `deps()` so the conditional-dependency shift can be proven.
 */
import { computed, onMounted, ref, shallowRef } from 'vue';
import { Sheet } from '../../examples/playground/src/examples/formula-grid/Sheet';
import {
  COLS,
  OVERSCAN,
  ROWS,
  ROW_HEIGHT,
  VIEWPORT_HEIGHT,
  colLabel,
} from '../../examples/playground/src/examples/formula-grid/formula-logic';
import { useRowWindow } from '../grid/useRowWindow';

/** A1-style label for a 1-based (row,col). */
function a1(row: number, col: number): string {
  return colLabel(col - 1) + row;
}

export function useFormulaGrid() {
  const sheet = shallowRef<Sheet | null>(null);
  const hasModel = ref(false);
  const creationMs = ref(0);

  const scrollEl = ref<HTMLElement | null>(null);

  const win = useRowWindow({
    rowCount: () => (sheet.value ? sheet.value.rows : 0),
    rowHeight: ROW_HEIGHT,
    viewportHeight: VIEWPORT_HEIGHT,
    overscan: OVERSCAN,
  });

  const mountedCells = computed(() => win.visibleRows.value.length * COLS);
  const modelCells = computed(() =>
    sheet.value ? sheet.value.rows * COLS : 0,
  );

  /** Build the whole sheet up front and time ONLY the instance creation. */
  function createModel(rowCount: number = ROWS) {
    editing.value = null;
    const t0 = performance.now();
    const s = new Sheet(rowCount, COLS);
    const t1 = performance.now();
    creationMs.value = t1 - t0;
    sheet.value = s;
    hasModel.value = true;
    // eslint-disable-next-line no-console
    console.log(
      `[formula] created ${rowCount * COLS} cells in ${creationMs.value.toFixed(2)}ms`,
    );
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

  // --- programmatic drivers used by the measurement harness (0-based r,c) ---
  function setScroll(px: number) {
    const max = Math.max(0, win.totalHeight.value - VIEWPORT_HEIGHT);
    const clamped = Math.min(Math.max(0, px), max);
    win.scrollTop.value = clamped;
    if (scrollEl.value) scrollEl.value.scrollTop = clamped;
  }
  function editCell(r: number, c: number, v: string) {
    const cell = sheet.value?.cellAt(r + 1, c + 1);
    if (cell) cell.raw.value = v;
  }
  function materializeAll() {
    const s = sheet.value;
    if (!s) return;
    const t0 = performance.now();
    s.forEach((cell) => cell.touch());
    // eslint-disable-next-line no-console
    console.log(
      `[formula] materialized all cells in ${(performance.now() - t0).toFixed(2)}ms`,
    );
  }

  onMounted(() => {
    (window as any).__grid = {
      arm: 'formula',
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
      /** The literal formula/text the cell holds. */
      cellRaw: (r: number, c: number) =>
        sheet.value?.cellAt(r + 1, c + 1)?.raw.value ?? null,
      /** The cell's resolved value (number/string/error), for assertions. */
      cellValue: (r: number, c: number) => {
        const v = sheet.value?.cellAt(r + 1, c + 1)?.value.value;
        return v && typeof v === 'object' ? String(v) : (v ?? null);
      },
      /** The live tracked dependency set of a formula cell, as A1 refs. */
      deps: (r: number, c: number) =>
        (sheet.value?.traceDeps(r + 1, c + 1) ?? []).map(([rr, cc]) => ({
          row: rr,
          col: cc,
          ref: a1(rr, cc),
        })),
    };
  });

  return {
    // config
    COLS,
    colLabel,
    // state
    sheet,
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
    // interaction
    editing,
    isEditing,
    edit,
    commitEdit,
    createModel,
  };
}

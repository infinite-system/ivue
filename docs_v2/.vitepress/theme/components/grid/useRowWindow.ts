/**
 * Shared, identical row-windowing for every arm.
 *
 * Ported unchanged from `demo/grid/useRowWindow.ts`. Given a (reactive) row
 * count, a fixed row height and a viewport height, it derives which
 * contiguous band of rows is on screen plus the translate offset and total
 * scroll height. This is the ENTIRE virtualization strategy and it is
 * byte-for-byte the same code for every arm — only the per-cell model
 * differs between them.
 */
import { computed, ref } from 'vue';

export interface RowWindowOptions {
  /** Reactive current number of rows (0 before the model is created). */
  rowCount: () => number;
  rowHeight: number;
  viewportHeight: number;
  overscan?: number;
}

export function useRowWindow(opts: RowWindowOptions) {
  const overscan = opts.overscan ?? 4;
  const visibleCount = Math.ceil(opts.viewportHeight / opts.rowHeight);

  /** Live scroll offset in px (writable so pages can scroll programmatically). */
  const scrollTop = ref(0);

  const totalHeight = computed(() => opts.rowCount() * opts.rowHeight);

  const startRow = computed(() =>
    Math.max(0, Math.floor(scrollTop.value / opts.rowHeight) - overscan),
  );

  const endRow = computed(() =>
    Math.min(opts.rowCount(), startRow.value + visibleCount + overscan * 2),
  );

  const offsetY = computed(() => startRow.value * opts.rowHeight);

  /** The explicit list of row indices currently mounted in the DOM. */
  const visibleRows = computed(() => {
    const arr: number[] = [];
    for (let r = startRow.value; r < endRow.value; r++) arr.push(r);
    return arr;
  });

  const onScroll = (e: Event) => {
    scrollTop.value = (e.target as HTMLElement).scrollTop;
  };

  return {
    scrollTop,
    totalHeight,
    startRow,
    endRow,
    offsetY,
    visibleRows,
    onScroll,
  };
}

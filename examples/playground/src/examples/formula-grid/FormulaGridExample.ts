// FormulaGridExample.ts — the formula-grid route's state, in ivue. The
// MODEL (Sheet + FormulaCell) is the exact code the measured RESULTS.md
// numbers were produced with; this class is the page around it.
// `fast-formula-parser` loads via a dynamic import inside create(), so the
// route costs nothing until you build a sheet.
import { ref, shallowRef } from 'vue';
import { Reactive } from '../../ivue';
import {
  COLS,
  ROW_HEIGHT,
  VIEWPORT_HEIGHT,
  OVERSCAN,
  colLabel,
} from './formula-logic';
import type { Sheet as SheetModel } from './Sheet';
import { useRowWindow } from '../benchmarks/useRowWindow';

class $FormulaGridExample {
  // MUTABLE STATE — the sheet is replaced wholesale; shallowRef keeps a
  // million cells out of the deep-proxy machinery.
  get sheet() {
    return shallowRef<SheetModel | null>(null);
  }
  get loading() {
    return ref(false);
  }
  get creationMs() {
    return ref(0);
  }
  get editing() {
    return ref<{ r: number; c: number } | null>(null);
  }
  // re-trace deps after an edit (traceDeps is not reactive)
  get depsBump() {
    return ref(0);
  }

  // COMPOSABLE — the row window, hosted whole, created on first touch.
  protected get $window() {
    return useRowWindow({
      rowCount: () => (this.sheet.value ? this.sheet.value.rows : 0),
      rowHeight: ROW_HEIGHT,
      viewportHeight: VIEWPORT_HEIGHT,
      overscan: OVERSCAN,
    });
  }
  get window() {
    return this.$window;
  }
  get scrollEl() {
    return this.$window.scrollEl;
  }

  // DERIVED — plain getters; zero allocations per instance.
  get hasModel() {
    return this.sheet.value !== null;
  }
  get modelCells() {
    return this.sheet.value ? this.sheet.value.rows * COLS : 0;
  }
  get mountedCells() {
    return this.$window.visibleRows.value.length * COLS;
  }
  get activeCell() {
    const active = this.editing.value;
    if (!active || !this.sheet.value) return null;
    return this.sheet.value.cellAt(active.r + 1, active.c + 1) ?? null;
  }
  get activeDeps(): string[] {
    void this.depsBump.value;
    const active = this.editing.value;
    const model = this.sheet.value;
    if (!active || !model) return [];
    return model
      .traceDeps(active.r + 1, active.c + 1)
      .map(([row, col]) => this.a1(row - 1, col - 1));
  }

  async create(rows: number) {
    this.loading.value = true;
    this.editing.value = null;
    // The parser ships in its own lazy chunk; first click pays it once.
    const { Sheet } = await import('./Sheet');
    const start = performance.now();
    const model = new Sheet(rows, COLS);
    this.creationMs.value = performance.now() - start;
    this.sheet.value = model;
    this.loading.value = false;
  }

  isEditing(row: number, col: number) {
    return (
      !!this.editing.value &&
      this.editing.value.r === row &&
      this.editing.value.c === col
    );
  }

  edit(row: number, col: number) {
    this.editing.value = { r: row, c: col };
  }

  commitEdit() {
    this.editing.value = null;
    this.depsBump.value++;
  }

  a1(row0: number, col0: number) {
    return colLabel(col0) + (row0 + 1);
  }
}

export namespace FormulaGridExample {
  export const $Class = $FormulaGridExample; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}

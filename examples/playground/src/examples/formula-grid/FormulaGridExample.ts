// FormulaGridExample.ts — the formula-grid route's state, in ivue. The
// MODEL (Sheet + FormulaCell + FormulaLogic) is the exact code the
// measured RESULTS.md numbers were produced with; this class is the page
// around it. `fast-formula-parser` loads via a dynamic import inside
// create(), so the route costs nothing until you build a sheet.
import { ref, shallowRef } from 'vue';
import { Reactive } from '../../ivue';
import { useRowWindow } from '../benchmarks/useRowWindow';
import { FormulaLogic } from './FormulaLogic';
import type { Sheet } from './Sheet';

class $FormulaGridExample {
  // MUTABLE STATE — the sheet is replaced wholesale; shallowRef keeps a
  // million cells out of the deep-proxy machinery.
  get sheet() {
    return shallowRef<Sheet.Model | null>(null);
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
      rowHeight: this.Logic.ROW_HEIGHT,
      viewportHeight: this.Logic.VIEWPORT_HEIGHT,
      overscan: this.Logic.OVERSCAN,
    });
  }
  get window() {
    return this.$window;
  }

  // TEMPLATE-REF TARGET — the scroll viewport; the SFC binds ref="scrollEl"
  get scrollEl() {
    return ref<HTMLElement | null>(null);
  }

  /** The pure-logic layer the page sizes and labels with. */
  get Logic() {
    return FormulaLogic.Class;
  }

  // DERIVED — plain getters; zero allocations per instance.
  get columnCount() {
    return this.Logic.COLS;
  }
  get smallRowCount() {
    return this.Logic.ROWS;
  }
  get largeRowCount() {
    return this.Logic.ROWS_1M;
  }
  get createLabel() {
    return this.loading.value ? 'Loading parser…' : 'Create 100k cells';
  }
  get hasModel() {
    return this.sheet.value !== null;
  }
  get modelCells() {
    return this.sheet.value ? this.sheet.value.rows * this.columnCount : 0;
  }
  get modelCellsLabel() {
    return this.modelCells.toLocaleString();
  }
  get viewportStyle() {
    return { height: `${this.$window.totalHeight.value}px` };
  }
  get rowsStyle() {
    return { transform: `translateY(${this.$window.offsetY.value}px)` };
  }
  get mountedCells() {
    return this.$window.visibleRows.value.length * this.columnCount;
  }
  get mountedCellsLabel() {
    return this.mountedCells.toLocaleString();
  }
  get creationLabel() {
    return this.creationMs.value.toFixed(1);
  }
  get activeName() {
    const active = this.editing.value;
    return active ? this.a1(active.r, active.c) : 'fx';
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
  get activeDepsLabel() {
    return this.activeDeps.join(', ');
  }
  get hasActiveDeps() {
    return this.activeDeps.length > 0;
  }

  async create(rows: number) {
    this.loading.value = true;
    this.editing.value = null;
    // The parser ships in its own lazy chunk; first click pays it once.
    const { Sheet } = await import('./Sheet');
    const start = performance.now();
    const model = new Sheet.Class(rows, this.columnCount);
    this.creationMs.value = performance.now() - start;
    this.sheet.value = model;
    this.loading.value = false;
  }

  createSmall() {
    return this.create(this.smallRowCount);
  }

  createLarge() {
    return this.create(this.largeRowCount);
  }

  columnLabel(columnIndex: number) {
    return this.Logic.colLabel(columnIndex);
  }

  /** Header label for a 1-based `v-for="c in columnCount"` column. */
  headerLabel(columnNumber: number) {
    return this.columnLabel(columnNumber - 1);
  }

  /** The 1-based row number the gutter shows. */
  rowNumber(row: number) {
    return row + 1;
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
    return this.columnLabel(col0) + (row0 + 1);
  }
}

export namespace FormulaGridExample {
  export const $Class = $FormulaGridExample; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}

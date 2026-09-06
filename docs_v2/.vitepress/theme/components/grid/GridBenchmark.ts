// GridBenchmark.ts — the flagship grid benchmark's model, embedded live in
// the docs. One shared control panel builds all three arms at once (from
// the same seeded data), a comparison strip puts creation time + measured
// heap side by side, and an arm switcher shows one virtualized grid at a
// time. The three arms share every byte of logic except the per-cell model
// (`cell-logic.ts`, `useRowWindow.ts`, `useGridArm.ts` — the playground's
// files, imported unchanged). Model creation is always behind an explicit
// click — nothing runs on mount, so this is cheap during SSR and on first
// paint.
import type { Ref } from 'vue';
import { ref } from 'vue';
import { Reactive } from '../../../../../lib/Reactive';
import { Static } from '../../../../../lib/Static';
import { IvueCell } from '../../../../../examples/playground/src/examples/benchmarks/IvueCell';
import { createComposableCell } from '../../../../../examples/playground/src/examples/benchmarks/composableCell';
import { createPojoCell } from '../../../../../examples/playground/src/examples/benchmarks/pojoCell';
import {
  COLS,
  ROWS,
  ROWS_1M as ROWS_MILLION,
  colLabel,
  fmtSum,
  initialRaw,
  cssOf,
  displayOf,
  isNumberOf,
  numericOf,
} from '../../../../../examples/playground/src/examples/benchmarks/cell-logic';
import { useGridArm } from '../../../../../examples/playground/src/examples/benchmarks/useGridArm';

class $GridBenchmark {
  /* Knobs — STATIC */

  static get ARMS(): GridBenchmark.ArmSpec[] {
    return [
      { key: 'composable', tag: 'Arm A', label: 'Composable', accent: 'sky' },
      { key: 'ivue', tag: 'Arm B', label: 'ivue', accent: 'indigo' },
      { key: 'pojo', tag: 'Arm C', label: 'POJO floor', accent: 'slate' },
    ];
  }

  /** Measured heap figures from demo/grid/RESULTS.md (median of 3 runs,
   *  headless Chromium, gc-forced reads). NOT computed live in the reader's
   *  browser — accurate heap deltas need `--js-flags=--expose-gc`, which a
   *  normal page load does not have. Quoted verbatim, keyed by the exact
   *  row count each button builds (ROWS → 100k, ROWS_MILLION → 1M). */
  static get MEASURED_HEAP(): Record<number, Record<GridBenchmark.ArmKey, string>> {
    return {
      [ROWS]: { composable: '77.3 MB', ivue: '5.7 MB', pojo: '4.5 MB' },
      [ROWS_MILLION]: { composable: '757.7 MB', ivue: '41.7 MB', pojo: '40.5 MB' },
    };
  }

  /** The playground's grid constants, read through the class — derived, so lowerCamel. */
  static get columnCount() {
    return COLS;
  }

  static get rowsHundredThousand() {
    return ROWS;
  }

  static get rowsMillion() {
    return ROWS_MILLION;
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $GridBenchmark;
  }

  // MUTABLE STATE
  get activeArm() {
    return ref<GridBenchmark.ArmKey>('ivue');
  }

  get lastRowCount() {
    return ref<number | null>(null);
  }

  // HOSTED arms — each a `useGridArm` controller, created on first touch
  protected get $composable() {
    return useGridArm(
      (row: number, col: number) => this.makeComposableCell(row, col),
      (cell) => cell.numericValue.value,
    );
  }

  protected get $ivue() {
    return useGridArm(
      (row: number, col: number) => this.makeIvueCell(row, col),
      (cell) => cell.numericValue.value,
    );
  }

  protected get $pojo() {
    return useGridArm(
      (row: number, col: number) => this.makePojoCell(row, col),
      (cell) => numericOf(cell.raw),
    );
  }

  /** The controllers, exposed for the template's dotted reads. */
  get composable() {
    return this.$composable;
  }

  get ivue() {
    return this.$ivue;
  }

  get pojo() {
    return this.$pojo;
  }

  // TEMPLATE-REF TARGETS — forwarded from each controller, distinct names
  get composableScrollEl(): Ref<HTMLElement | null> {
    return this.$composable.scrollEl;
  }

  get ivueScrollEl(): Ref<HTMLElement | null> {
    return this.$ivue.scrollEl;
  }

  get pojoScrollEl(): Ref<HTMLElement | null> {
    return this.$pojo.scrollEl;
  }

  // DERIVED — plain getters
  get arms() {
    return this.self.ARMS;
  }

  get columns() {
    return this.self.columnCount;
  }

  get hasAny() {
    return this.$composable.hasModel.value || this.$ivue.hasModel.value || this.$pojo.hasModel.value;
  }

  get isMillionBuild() {
    return this.lastRowCount.value === this.self.rowsMillion;
  }

  get lastBuildLabel() {
    return this.isMillionBuild ? '1,000,000' : '100,000';
  }

  get isComposableActive() {
    return this.activeArm.value === 'composable';
  }

  get isIvueActive() {
    return this.activeArm.value === 'ivue';
  }

  get activeArmHint() {
    return this.activeArm.value === 'pojo'
      ? 'read-only · no reactivity, by design'
      : 'click arm cell to edit · scroll to virtualize';
  }

  get mountedCellsLabel() {
    return this.controllerOf(this.activeArm.value).mountedCells.value.toLocaleString();
  }

  get activeModelCellsLabel() {
    return this.controllerOf(this.activeArm.value).modelCells.value.toLocaleString();
  }

  /** Whether an arm is the ivue arm — the one that carries the winner badge. */
  isIvueArm(arm: GridBenchmark.ArmSpec) {
    return arm.key === 'ivue';
  }

  isActiveArm(arm: GridBenchmark.ArmSpec) {
    return this.activeArm.value === arm.key;
  }

  accentClass(arm: GridBenchmark.ArmSpec) {
    return `gb-accent-${arm.accent}`;
  }

  tabClass(arm: GridBenchmark.ArmSpec) {
    return [{ active: this.isActiveArm(arm) }, this.accentClass(arm)];
  }

  creationLabel(arm: GridBenchmark.ArmSpec) {
    return this.controllerOf(arm.key).creationMs.value.toFixed(1);
  }

  modelCellsLabel(arm: GridBenchmark.ArmSpec) {
    return this.controllerOf(arm.key).modelCells.value.toLocaleString();
  }

  heapLabel(arm: GridBenchmark.ArmSpec) {
    const rowCount = this.lastRowCount.value;
    if (!rowCount) return '—';
    return this.self.MEASURED_HEAP[rowCount]?.[arm.key] ?? '—';
  }

  headerLabel(column: number) {
    return colLabel(column - 1);
  }

  rowNumber(row: number) {
    return row + 1;
  }

  viewportStyle(arm: GridBenchmark.ArmKey) {
    return { height: this.controllerOf(arm).totalHeight.value + 'px' };
  }

  rowsStyle(arm: GridBenchmark.ArmKey) {
    return { transform: `translateY(${this.controllerOf(arm).offsetY.value}px)` };
  }

  sumLabel(arm: GridBenchmark.ArmKey, row: number) {
    return fmtSum(this.controllerOf(arm).rowSum(row));
  }

  /** POJO has no getters at all — derived values are pure functions read at
   *  render time (the arm's whole point: zero reactive machinery). */
  pojoDisplay(cell: GridBenchmark.PojoCell) {
    return displayOf(cell.raw, isNumberOf(cell.raw), numericOf(cell.raw));
  }

  pojoClass(cell: GridBenchmark.PojoCell) {
    return cssOf(isNumberOf(cell.raw), numericOf(cell.raw));
  }

  // ACTIONS
  createHundredThousand() {
    this.createAll(this.self.rowsHundredThousand);
  }

  createMillion() {
    this.createAll(this.self.rowsMillion);
  }

  /** Same order every time (A, B, C) — live numbers are illustrative, not
   *  the controlled measurement (RESULTS.md, one fresh page load per arm). */
  createAll(rowCount: number) {
    this.lastRowCount.value = rowCount;
    this.$composable.createModel(rowCount);
    this.$ivue.createModel(rowCount);
    this.$pojo.createModel(rowCount);
  }

  showArm(arm: GridBenchmark.ArmSpec) {
    this.activeArm.value = arm.key;
  }

  makeComposableCell(row: number, col: number) {
    return createComposableCell(row, col, initialRaw(row, col));
  }

  makeIvueCell(row: number, col: number) {
    return new IvueCell.Class(row, col, initialRaw(row, col));
  }

  makePojoCell(row: number, col: number) {
    return createPojoCell(row, col, initialRaw(row, col));
  }

  /** The stats every arm shares, by key — the switcher and the strip read these. */
  protected controllerOf(arm: GridBenchmark.ArmKey): GridBenchmark.ArmStats {
    if (arm === 'composable') return this.$composable;
    if (arm === 'ivue') return this.$ivue;
    return this.$pojo;
  }
}

export namespace GridBenchmark {
  export const $Class = Static($GridBenchmark); // anchor — it declares statics
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  export type ArmKey = 'composable' | 'ivue' | 'pojo';
  export interface ArmSpec {
    key: ArmKey;
    tag: string;
    label: string;
    accent: string;
  }
  export interface PojoCell {
    raw: string;
  }
  /** What the strip and the switcher read off any arm, whatever its cell type. */
  export interface ArmStats {
    creationMs: { readonly value: number };
    modelCells: { readonly value: number };
    mountedCells: { readonly value: number };
    totalHeight: { readonly value: number };
    offsetY: { readonly value: number };
    rowSum(row: number): number;
  }
}

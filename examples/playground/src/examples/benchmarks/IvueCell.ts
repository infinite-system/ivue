/**
 * ARM B — the ivue model, authored per the ivue operating manual.
 *
 * Ported from `demo/grid/IvueCell.ts` — identical logic, only the relative
 * import path to the engine changed (this file lives one directory deeper,
 * under `docs_v2/.vitepress/theme/components/grid/`).
 *
 *   - raw            → ref-getter (mutable state; `.value` to read/write)
 *   - isNumber       → PLAIN getter (0 bytes/instance, reactive via leaf tracking)
 *   - display        → PLAIN getter
 *   - cssClass       → PLAIN getter
 *   - numericValue   → computed()  ← the ONE hot derived value, read by the
 *                       visible row-sum column; the only surgical computed().
 *
 * Instances are plain objects. None of the getters run at construction, so the
 * refs/computeds MATERIALIZE LAZILY — a cell that is never rendered never
 * allocates a Ref or a Computed. That laziness is the whole point of the arm.
 */
import { computed, ref } from 'vue';
import { Reactive } from '../../ivue';
import { cssOf, displayOf, isNumberOf, numericOf } from './cell-logic';

class $IvueCell {

  constructor(row: number, col: number, initial: string) {
    this.row = row;
    this.col = col;
    this.iv = initial;
  }

  // CONSTANTS — plain fields, never mutated (safe: not reactive state).
  readonly row: number;

  readonly col: number;

  protected readonly iv: string;

  // MUTABLE STATE — ref-getter; materializes on first touch.
  get raw() {
    return ref(this.iv);
  }

  // HOT DERIVED — the single surgical computed(): feeds the row-sum column.
  // computed: expensive — the ONE hot derived value, read by the row-sum column
  get numericValue() {
    return computed(() => this.computeNumericValue());
  }

  // DERIVED — plain getters. Reactive via leaf tracking; zero per-instance cost.
  get isNumber() {
    return isNumberOf(this.raw.value);
  }

  get display() {
    return displayOf(this.raw.value, this.isNumber, this.numericValue.value);
  }

  get cssClass() {
    return cssOf(this.isNumber, this.numericValue.value);
  }

  // Read every derived value once (used only to force full materialization of
  // all cells, for the worst-case "everything touched" comparison).
  computeNumericValue() {
    return numericOf(this.raw.value);
  }

  touch() {
    void this.display;
    void this.isNumber;
    void this.cssClass;
    void this.numericValue.value;
  }
}

export namespace IvueCell {
  export const $Class = $IvueCell;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}

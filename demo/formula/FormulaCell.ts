/**
 * A single spreadsheet cell, authored per the ivue operating manual.
 *
 *   - raw       → ref-getter: the LITERAL text the user typed
 *                 ('42' | 'hello' | '=A1+B2'). Mutable state, `.value` to r/w.
 *   - value     → the ONE computed(): parse + evaluate the formula (or resolve
 *                 the literal). Parsing+evaluating is real work, correctly
 *                 memoized. This is the whole integration seam: the parser's
 *                 onCell/onRange hooks read OTHER cells' `value.value` from
 *                 inside THIS computed's effect, so Vue discovers the formula's
 *                 dependencies automatically — no hand-built dependency graph.
 *   - display / isFormula / cssClass → PLAIN getters (0 bytes/instance,
 *                 reactive via leaf tracking), exactly the `IvueCell` shape.
 *
 * Instances are plain objects. None of the getters run at construction, so the
 * ref and computed MATERIALIZE LAZILY — a cell that is never rendered never
 * allocates a Ref or a Computed. That laziness is the whole point.
 */
import { computed, ref, type ComputedRef } from 'vue';
import { Reactive } from '../../lib/Reactive';
import type { Sheet } from './Sheet';
import {
  type CellValue,
  cssOf,
  displayOf,
  evalLiteral,
  isFormulaText,
  stripFormula,
} from './formula-logic';

class $FormulaCell {
  // CONSTANTS / CONFIG — plain fields, set once, never mutated.
  // `sheet` is an injected dependency (the parser + O(1) cellAt live on it),
  // `row`/`col` are the 1-based position used by the parser and ROW()/COLUMN().
  readonly sheet: Sheet;
  readonly row: number;
  readonly col: number;
  private readonly iv: string;

  constructor(sheet: Sheet, row: number, col: number, initial: string) {
    this.sheet = sheet;
    this.row = row;
    this.col = col;
    this.iv = initial;
  }

  // MUTABLE STATE — ref-getter; materializes on first touch.
  get raw() {
    return ref(this.iv);
  }

  // HOT DERIVED — the single surgical computed(). Parsing + evaluating is real
  // work; memoizing it is exactly the "one hot value" the ivue idiom promotes.
  get value(): ComputedRef<CellValue> {
    return computed<CellValue>(() => {
      const text = this.raw.value;
      if (!isFormulaText(text)) return evalLiteral(text);
      // The reads inside sheet.evaluate() (onCell/onRange → other cells'
      // value.value) are tracked by THIS computed's effect → auto deps.
      return this.sheet.evaluate(this, stripFormula(text));
    });
  }

  // DERIVED — plain getters. Reactive via leaf tracking; zero per-instance cost.
  get isFormula() {
    return isFormulaText(this.raw.value);
  }
  get display() {
    return displayOf(this.value.value);
  }
  get cssClass() {
    return cssOf(this.value.value, this.isFormula);
  }

  // Read every derived value once — used only by the measurement harness to
  // force full materialization of all 100k cells for the worst-case number.
  touch() {
    void this.value.value;
    void this.display;
    void this.isFormula;
    void this.cssClass;
  }
}

export namespace FormulaCell {
  export const $Class = $FormulaCell;
  export const Class = Reactive($FormulaCell);
  export type Instance = typeof Class.Instance;
}

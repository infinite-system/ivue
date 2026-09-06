/**
 * FlyweightCell — the disposable facade. THREE fields; everything else is
 * plain getters delegating to the sheet's tracked accessors, so:
 *
 *   - construction allocates one near-empty object (ivue runs nothing at
 *     `new`, and plain getters de-optimize to native prototype getters);
 *   - reads are tracked through whatever effect performs them — a facade in
 *     a template subscribes the component exactly like a real cell would;
 *   - the reactive state lives on the SHEET's sparse overlay, so facades are
 *     created per render and dropped on scroll with zero loss.
 *
 * The reference `FormulaCell` (demo/formula) holds its own ref + computed;
 * this holds NOTHING — that is the flyweight move.
 */
import { Reactive } from '../../../ivue';
import { FlyweightLogic } from '../FlyweightLogic';
import type { FlyweightSheet } from './FlyweightSheet';

class $FlyweightCell {

  constructor(sheet: FlyweightSheet.Model, row: number, col: number) {
    this.sheet = sheet;
    this.row = row;
    this.col = col;
  }

  readonly sheet: FlyweightSheet.Model;

  readonly row: number;

  readonly col: number;

  /** Resolved value — tracked point read through the sheet. */
  get value(): FlyweightLogic.CellValue {
    return this.sheet.valueAt(this.row, this.col);
  }

  /** The literal text (formula source / number text). */
  get source(): string {
    return this.sheet.sourceAt(this.row, this.col);
  }

  get isFormula(): boolean {
    return this.sheet.kindAt(this.row, this.col) === FlyweightLogic.Kind.Formula;
  }

  get display(): string {
    return FlyweightLogic.Class.displayOf(this.value);
  }

  get cssClass(): string {
    return FlyweightLogic.Class.cssOf(this.value, this.isFormula);
  }

  write(input: string): void {
    this.sheet.write(this.row, this.col, input);
  }
}

export namespace FlyweightCell {
  export const $Class = $FlyweightCell;
  export let Class = Reactive($Class);
  export type Model = InstanceType<typeof Class>; // raw-instance type — collections, parameters, returns
  export type Instance = typeof Class.Instance;
}

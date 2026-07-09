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
import { Reactive } from '../../../lib/Reactive';
import { Kind, cssOf, displayOf, type CellValue } from '../flyweight-logic';
import type { FlyweightSheet } from './FlyweightSheet';

class $FlyweightCell {
  readonly sheet: FlyweightSheet.Instance;
  readonly row: number;
  readonly col: number;

  constructor(sheet: FlyweightSheet.Instance, row: number, col: number) {
    this.sheet = sheet;
    this.row = row;
    this.col = col;
  }

  /** Resolved value — tracked point read through the sheet. */
  get value(): CellValue {
    return this.sheet.valueAt(this.row, this.col);
  }

  /** The literal text (formula source / number text). */
  get source(): string {
    return this.sheet.sourceAt(this.row, this.col);
  }

  get isFormula(): boolean {
    return this.sheet.kindAt(this.row, this.col) === Kind.Formula;
  }

  get display(): string {
    return displayOf(this.value);
  }

  get cssClass(): string {
    return cssOf(this.value, this.isFormula);
  }

  write(input: string): void {
    this.sheet.write(this.row, this.col, input);
  }
}

export namespace FlyweightCell {
  export const $Class = $FlyweightCell;
  export const Class = Reactive($FlyweightCell);
  export type Instance = typeof Class.Instance;
}

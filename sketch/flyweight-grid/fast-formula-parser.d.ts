/**
 * Minimal ambient types for `fast-formula-parser` (ships no .d.ts). Own copy
 * for the sketch — `demo/formula/` is reference-only, never imported. Only
 * the surface this sketch uses is declared; the sketch directory is not part
 * of the library's `tsc` build, so this exists for editor ergonomics and the
 * sketch-local typecheck.
 */
declare module 'fast-formula-parser' {
  export interface CellRef {
    row: number;
    col: number;
    sheet?: string;
  }
  export interface RangeRef {
    from: CellRef;
    to: CellRef;
    sheet?: string;
  }
  export interface FormulaParserConfig {
    onCell?: (ref: CellRef) => unknown;
    onRange?: (ref: RangeRef) => unknown[][];
  }
  export class FormulaError {
    constructor(error: string, details?: unknown);
    readonly error: string;
    readonly details?: unknown;
    toString(): string;
  }
  export default class FormulaParser {
    constructor(config?: FormulaParserConfig);
    parse(formula: string, position: CellRef): unknown;
    static FormulaError: typeof FormulaError;
  }
}

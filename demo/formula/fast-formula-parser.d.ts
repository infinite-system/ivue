/**
 * Minimal ambient types for `fast-formula-parser` (the package ships no .d.ts).
 * Only the surface this demo uses is declared. The demo directory is not part
 * of the library's `tsc` build, so this exists purely for editor ergonomics.
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

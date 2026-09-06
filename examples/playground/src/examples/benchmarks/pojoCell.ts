/**
 * ARM C (bonus) — a plain, NON-reactive POJO model: the memory floor.
 *
 * Ported unchanged from `demo/grid/pojoCell.ts`. Just the raw data, no refs,
 * no computeds, no getters. Derived values are computed on demand by pure
 * functions at render time. This is the theoretical minimum a cell model can
 * occupy; it exists only as a reference point. Edits mutate `raw` but do NOT
 * re-render (there is no reactivity here — by design).
 */
import { numericOf } from './cell-logic';

export interface PojoCell {
  row: number;
  col: number;
  raw: string;
}

export function createPojoCell(
  row: number,
  col: number,
  initial: string,
): PojoCell {
  return { row, col, raw: initial };
}

export function pojoRowSum(row: PojoCell[]): number {
  let sum = 0;
  for (let index = 0; index < row.length; index++) sum += numericOf(row[index].raw);
  return sum;
}

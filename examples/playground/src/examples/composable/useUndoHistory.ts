// useUndoHistory.ts — the composable face over the UndoHistory class.
//
// One instance per call, like any useX(): a consumer who only knows
// composables uses it without learning anything, and quietly gets the
// class architecture underneath — lazy state, plain-getter derivations,
// a model that can be subclassed (extend UndoHistory.$Class) and swapped
// (reassign UndoHistory.Class) without touching a single caller.
import { UndoHistory } from './UndoHistory';

export function useUndoHistory() {
  return new UndoHistory.Class();
}

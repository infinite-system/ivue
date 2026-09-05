// UndoHistory.ts — class logic published behind a composable face
// (useUndoHistory.ts). Consumers who only know composables call
// useUndoHistory() and destructure; the internals are an ivue class:
// lazy state, zero-byte derivations, subclassable, disposable.
//
// A history is a list of labeled SNAPSHOTS and a cursor into it. Every
// operation on the edited thing records a snapshot; undo and redo only
// move the cursor, so the edited thing is always `current.items`.
import { ref, shallowRef } from 'vue';
import { Reactive } from '../../ivue';

class $UndoHistory {
  // MUTABLE STATE — replaced wholesale on every push, never mutated in
  // place, so shallowRef is the right cell.
  get entries() {
    return shallowRef<UndoHistory.Snapshot[]>([
      { label: 'start', items: [] },
    ]);
  }
  get cursor() {
    return ref(0);
  }

  // DERIVED — plain getters, zero bytes per instance
  get current() {
    return this.entries.value[this.cursor.value];
  }
  get items() {
    return this.current.items;
  }
  get canUndo() {
    return this.cursor.value > 0;
  }
  get canRedo() {
    return this.cursor.value < this.entries.value.length - 1;
  }
  get depth() {
    return this.entries.value.length;
  }
  get positionLabel() {
    return `${this.cursor.value + 1} / ${this.depth}`;
  }
  /** The step to undo, named — what an Undo button should say. */
  get undoLabel() {
    return this.canUndo ? `undo "${this.current.label}"` : 'undo';
  }
  /** The step to redo, named. */
  get redoLabel() {
    return this.canRedo
      ? `redo "${this.entries.value[this.cursor.value + 1].label}"`
      : 'redo';
  }

  /** Whether a history entry is the current one (a per-row template condition). */
  isCurrent(index: number) {
    return index === this.cursor.value;
  }

  /** Whether a history entry is a redo branch past the cursor. */
  isAhead(index: number) {
    return index > this.cursor.value;
  }

  /** Record a new labeled snapshot; anything past the cursor (a redo
   *  branch) is discarded, the way every editor's history behaves. */
  push(label: string, items: readonly string[]) {
    const kept = this.entries.value.slice(0, this.cursor.value + 1);
    this.entries.value = [...kept, { label, items: [...items] }];
    this.cursor.value = kept.length;
  }

  undo() {
    if (this.canUndo) this.cursor.value--;
  }

  redo() {
    if (this.canRedo) this.cursor.value++;
  }

  /** Jump the cursor straight to an entry — clicking a step in the rail. */
  jumpTo(index: number) {
    if (index >= 0 && index < this.depth) this.cursor.value = index;
  }

  clear() {
    this.entries.value = [{ label: 'start', items: [] }];
    this.cursor.value = 0;
  }
}

export namespace UndoHistory {
  export const $Class = $UndoHistory; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  /** One recorded step: what was done, and the whole state after it. */
  export interface Snapshot {
    label: string;
    items: readonly string[];
  }
}

// GroceryList.ts — the thing being edited. Every operation is a method
// that records a labeled snapshot in the history it hosts, so undo and
// redo are the history's cursor moving over states this class produced.
import { Reactive } from '../../ivue';
import { UndoHistory } from './UndoHistory';

class $GroceryList {
  // HOSTED composable-shaped model: the history behind a `$`-getter,
  // created on first touch, held for the life of this instance
  protected get $history() {
    return new UndoHistory.Class();
  }

  /** The history, exposed for the template's buttons. */
  get history() {
    return this.$history;
  }

  /** The rail's rows — the history's entries, read as a plain value. */
  get steps() {
    return this.$history.entries.value;
  }

  // DERIVED — the list IS the current snapshot; nothing is stored twice
  get items() {
    return this.$history.items;
  }
  get count() {
    return this.items.length;
  }
  get isEmpty() {
    return this.count === 0;
  }

  /** The pantry the "add" button draws from, in order. */
  get pantry() {
    return ['milk', 'eggs', 'bread', 'apples', 'coffee', 'rice', 'olive oil', 'lemons'];
  }
  get nextItem() {
    return this.pantry[this.count % this.pantry.length];
  }
  get addLabel() {
    return `add ${this.nextItem}`;
  }

  // ACTIONS — each one records a step
  add() {
    const item = this.nextItem;
    this.$history.push(`add ${item}`, [...this.items, item]);
  }

  double() {
    if (this.isEmpty) return;
    const doubled = this.items.map((item) => (item.startsWith('2× ') ? item : `2× ${item}`));
    this.$history.push('double everything', doubled);
  }

  sort() {
    if (this.isEmpty) return;
    this.$history.push('sort A→Z', [...this.items].sort());
  }

  reverse() {
    if (this.isEmpty) return;
    this.$history.push('reverse', [...this.items].reverse());
  }
}

export namespace GroceryList {
  export const $Class = $GroceryList; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}

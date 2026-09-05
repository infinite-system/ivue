// ComposableExample.ts — the route's ONE model. It hosts the two demos
// behind `$`-getters: a class that HOSTS a composable (Pointer over
// useMouse) and a class PUBLISHED as one (GroceryList over the same
// UndoHistory that useUndoHistory() hands a composable consumer).
import { Reactive } from '../../ivue';
import { GroceryList } from './GroceryList';
import { Pointer } from './Pointer';

class $ComposableExample {
  constructor() {
    // First touch INSIDE setup on purpose: useMouse's listeners must land
    // in the component's scope so unmount cleans them up.
    void this.$pointer;
  }

  protected get $pointer() {
    return new Pointer.Class();
  }

  protected get $list() {
    return new GroceryList.Class();
  }

  /** The hosted models, exposed for the template's dotted reads. */
  get pointer() {
    return this.$pointer;
  }
  get list() {
    return this.$list;
  }
  get history() {
    return this.$list.history;
  }
}

export namespace ComposableExample {
  export const $Class = $ComposableExample; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}

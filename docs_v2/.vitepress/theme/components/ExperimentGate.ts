// ExperimentGate.ts — renders its slot only when the URL carries the flag.
//
// This hides a page from DISCOVERY, not from a reader who wants it: the
// markup still ships in the page bundle, and the URL is the whole key. It
// keeps an unfinished bench off the sidebar and out of a casual reader's
// path, and nothing more than that.
//
// `shown` starts false so the static build renders nothing; the query is
// read on mount, which is also when a client-side navigation lands.
import { onMounted, ref } from 'vue';
import { Reactive } from '../../../../lib/Reactive';
import { Static } from '../../../../lib/Static';

class $ExperimentGate {
  /** the query key that reveals the slot */
  static readonly FLAG: string = 'experiment';

  constructor() {
    onMounted(() => this.reveal());
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $ExperimentGate;
  }

  // MUTABLE STATE
  get shown() {
    return ref(false);
  }

  // METHODS
  reveal() {
    this.shown.value = new URLSearchParams(window.location.search).has(this.self.FLAG);
  }
}

export namespace ExperimentGate {
  export const $Class = Static($ExperimentGate); // anchor — it declares statics
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance;
}

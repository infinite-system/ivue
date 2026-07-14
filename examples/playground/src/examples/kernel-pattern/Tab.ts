// Tab.ts — a base app class, opted into the kernel. The ONLY differences from
// a plain ivue class: `Class` is `let` (the live binding the kernel rewrites)
// and one kernel.defineClass line. Call sites stay `new Tab.Class(...)`.
import { ref } from 'vue';
import { Reactive } from '../../ivue';
import { kernel } from './kernel';

export class $Tab {
  constructor(public title: string) {}

  get closed() {
    return ref(false);
  }

  // DERIVED — plugins override these; plain getters, super-chainable, 0 bytes.
  get badges(): string[] {
    return [];
  }
  get accent(): string {
    return '#6366f1';
  }
}

export namespace Tab {
  export const $Class = $Tab; // raw — children/plugins extend this
  export let Class = Reactive($Class); // live binding — you `new` this
  export type Instance = typeof Class.Instance;
}

kernel.defineClass('Tab', Tab);

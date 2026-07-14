// Tab.ts — an app class the kernel can swap. This file is "the app": it
// knows nothing about any plugin. It exposes a base class and a make()
// convention that constructs THROUGH the kernel by name.
import { ref } from 'vue';
import { Reactive, type ReactiveInstance } from '../../ivue';
import { kernel } from './kernel';

export class $Tab {
  constructor(public title: string) {}

  // reactive state — a ref-getter, materialized on first touch
  get closed() {
    return ref(false);
  }

  // DERIVED — plugins override these to change what a tab shows and does.
  // Plain getters: zero bytes, reactive via leaf tracking, super-chainable.
  get badges(): string[] {
    return [];
  }
  get accent(): string {
    return '#6366f1';
  }

  close() {
    this.closed.value = true;
  }
}

export type TabInstance = ReactiveInstance<$Tab>;

/**
 * The make convention: resolve the class registered under 'Tab' (or the base
 * if no plugin touched it), wrap it with Reactive() — idempotent, so already
 * transformed ancestors are skipped — and construct. Every call site in the
 * app uses makeTab(); none of them names a concrete class.
 */
export function makeTab(title: string): TabInstance {
  const TabClass = Reactive(kernel.get('Tab', $Tab));
  return new TabClass(title) as TabInstance;
}

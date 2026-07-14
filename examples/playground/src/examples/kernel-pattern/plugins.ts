// plugins.ts — third-party code. A plugin is a function that EXTENDS whatever
// class it's handed and returns the subclass. Because each plugin extends the
// current class, plugins STACK: apply timestamp then priority and a tab gets
// both, each level chaining through `super`.
//
// A plugin author never edits Tab.ts — they extend $Tab (or whatever the
// previous plugin produced) and let the kernel route construction to them.
import { ref } from 'vue';
import { $Tab } from './Tab';

export type TabPlugin = (Base: typeof $Tab) => typeof $Tab;

/** Adds an opened-at timestamp and a badge showing it. */
export const timestampPlugin: TabPlugin = (Base) =>
  class extends Base {
    get openedAt() {
      return ref(new Date().toLocaleTimeString());
    }
    get badges(): string[] {
      return [...super.badges, `opened ${this.openedAt.value}`];
    }
  };

/** Flags the tab as priority — prepends a badge and repaints the accent. */
export const priorityPlugin: TabPlugin = (Base) =>
  class extends Base {
    get badges(): string[] {
      return ['priority', ...super.badges];
    }
    get accent(): string {
      return '#f59e0b'; // overrides the base accent — behavior, not just data
    }
  };

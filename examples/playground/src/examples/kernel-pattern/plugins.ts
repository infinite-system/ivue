// plugins.ts — third-party code. Each plugin extends whatever class it's
// handed; the kernel stacks them at seal, chaining through super.
import { ref } from 'vue';
import { $Tab } from './Tab';

export type TabPlugin = (Base: typeof $Tab) => typeof $Tab;

export const timestampPlugin: TabPlugin = (Base) =>
  class extends Base {
    get openedAt() {
      return ref(new Date().toLocaleTimeString());
    }
    get badges(): string[] {
      return [...super.badges, `opened ${this.openedAt.value}`];
    }
  };

export const priorityPlugin: TabPlugin = (Base) =>
  class extends Base {
    get badges(): string[] {
      return ['priority', ...super.badges];
    }
    get accent(): string {
      return '#f59e0b';
    }
  };

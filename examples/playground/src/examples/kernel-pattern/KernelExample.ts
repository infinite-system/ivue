// KernelExample.ts — the demo view-model, in ivue. Each plugin toggle is a
// mini-reboot: reset the kernel, register the active plugins, seal the class
// graph, then reconstruct the visible tabs — exactly the production flow
// (register → seal → mount), run again on change.
import { ref, shallowRef } from 'vue';
import { Reactive } from '../../ivue';
import { kernel } from './kernel';
import { Tab } from './Tab';
import { PinnedTab } from './PinnedTab';
import { timestampPlugin, priorityPlugin, type TabPlugin } from './plugins';

type Kind = 'tab' | 'pinned';
interface PluginEntry {
  id: string;
  label: string;
  make: TabPlugin;
}
interface GraphNode {
  name: string;
  extends: string | null;
  plugins: string[];
}

class $KernelExample {
  #counter = 0;

  constructor() {
    this.reboot();
    this.addTab('tab');
    this.addTab('pinned');
  }

  get tabs() {
    return shallowRef<any[]>([]);
  }
  get active() {
    return ref<Record<string, boolean>>({ timestamp: false, priority: false });
  }
  get graph() {
    return shallowRef<GraphNode[]>([]);
  }

  plugins: PluginEntry[] = [
    { id: 'timestamp', label: 'Timestamp', make: timestampPlugin },
    { id: 'priority', label: 'Priority', make: priorityPlugin },
  ];

  get activeSummary(): string {
    const on = this.plugins.filter((plugin) => this.active.value[plugin.id]);
    return on.length ? on.map((plugin) => plugin.label).join(' + ') : 'none';
  }

  isActive(id: string): boolean {
    return !!this.active.value[id];
  }

  /** register → seal → reconstruct: the whole boot, re-run on any change. */
  reboot() {
    kernel.reset();
    for (const plugin of this.plugins) {
      if (this.active.value[plugin.id]) {
        kernel.registerClass('Tab', plugin.make, plugin.label);
      }
    }
    kernel.sealClassGraph();
    this.graph.value = kernel.getClassGraph();
    this.tabs.value = this.tabs.value.map((tab) =>
      this.build(tab.__kind, tab.title),
    );
  }

  togglePlugin(id: string) {
    this.active.value = { ...this.active.value, [id]: !this.active.value[id] };
    this.reboot();
  }

  build(kind: Kind, title: string) {
    const instance =
      kind === 'pinned' ? new PinnedTab.Class(title) : new Tab.Class(title);
    (instance as any).__kind = kind;
    return instance;
  }

  addTab(kind: Kind) {
    const label = kind === 'pinned' ? 'Pinned' : 'Tab';
    this.tabs.value = [...this.tabs.value, this.build(kind, `${label} ${++this.#counter}`)];
  }

  closeTab(tab: any) {
    this.tabs.value = this.tabs.value.filter((existing) => existing !== tab);
  }
}

export namespace KernelExample {
  export const $Class = $KernelExample; // raw — children `extends` this
  export const Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}

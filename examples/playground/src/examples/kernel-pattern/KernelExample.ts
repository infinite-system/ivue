// KernelExample.ts — the demo view-model, in ivue. It toggles plugins,
// rebuilds the kernel registration from the base + active plugins, and
// constructs tabs through makeTab() so new tabs pick up whatever is live.
import { ref, shallowRef } from 'vue';
import { Reactive } from '../../ivue';
import { kernel } from './kernel';
import { $Tab, makeTab, type TabInstance } from './Tab';
import { timestampPlugin, priorityPlugin, type TabPlugin } from './plugins';

interface PluginEntry {
  id: string;
  label: string;
  apply: TabPlugin;
}

class $KernelExample {
  #counter = 0;

  constructor() {
    // The kernel is a module singleton — a previous visit may have left a
    // registration. Rebuild from the current (empty) plugin set so this
    // route always starts on the base class.
    this.rebuildRegistration();
    this.addTab();
  }

  get tabs() {
    return shallowRef<TabInstance[]>([]);
  }
  get active() {
    return ref<Record<string, boolean>>({ timestamp: false, priority: false });
  }

  // CONSTANTS — the available plugins; plain field, never mutated.
  plugins: PluginEntry[] = [
    { id: 'timestamp', label: 'Timestamp plugin', apply: timestampPlugin },
    { id: 'priority', label: 'Priority plugin', apply: priorityPlugin },
  ];

  // DERIVED — plain getters.
  get activeLabels(): string[] {
    return this.plugins
      .filter((plugin) => this.active.value[plugin.id])
      .map((plugin) => plugin.label);
  }
  get activeSummary(): string {
    return this.activeLabels.length
      ? this.activeLabels.join(' + ')
      : 'the base class only';
  }
  get hasTabs(): boolean {
    return this.tabs.value.length > 0;
  }

  /** Compose the active plugins over the base and register the result. */
  rebuildRegistration() {
    let TabClass: typeof $Tab = $Tab;
    for (const plugin of this.plugins) {
      if (this.active.value[plugin.id]) TabClass = plugin.apply(TabClass);
    }
    kernel.set('Tab', TabClass);
  }

  togglePlugin(id: string) {
    this.active.value = { ...this.active.value, [id]: !this.active.value[id] };
    this.rebuildRegistration();
  }

  isActive(id: string): boolean {
    return !!this.active.value[id];
  }

  addTab() {
    this.tabs.value = [...this.tabs.value, makeTab(`Tab ${++this.#counter}`)];
  }

  /** Re-construct every existing tab through the kernel — retrofit the
   *  current plugin set onto tabs made before it was installed. */
  remakeAll() {
    this.tabs.value = this.tabs.value.map((tab) => makeTab(tab.title));
  }

  closeTab(tab: TabInstance) {
    this.tabs.value = this.tabs.value.filter((existing) => existing !== tab);
  }
}

export namespace KernelExample {
  export const $Class = $KernelExample; // raw — children `extends` this
  export const Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}

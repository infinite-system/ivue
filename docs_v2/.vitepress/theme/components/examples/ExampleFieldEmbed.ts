// ExampleFieldEmbed.ts — the shared state for docs embeds of the Quasar
// field examples: installs Quasar into the docs app, then resolves the
// playground route component. Everything loads lazily, on mount.
import { markRaw, ref, type Component } from 'vue';
import { Reactive } from '../../../../../lib/Reactive';
import { installQuasar } from '../../quasar-docs-loader';

class $ExampleFieldEmbed {
  #load: () => Promise<{ default: Component }>;

  constructor(load: () => Promise<{ default: Component }>) {
    this.#load = load;
    this.mountExample();
  }

  get example() {
    return ref<Component | null>(null);
  }
  get failure() {
    return ref('');
  }

  async mountExample() {
    try {
      await installQuasar();
      const module = await this.#load();
      this.example.value = markRaw(module.default);
    } catch (error) {
      this.failure.value = String(error);
    }
  }
}

export namespace ExampleFieldEmbed {
  export const $Class = $ExampleFieldEmbed; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}

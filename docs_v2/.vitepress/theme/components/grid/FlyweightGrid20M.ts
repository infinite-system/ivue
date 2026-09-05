// FlyweightGrid20M.ts — the flyweight grid's docs gate: the ENTIRE app is
// imported dynamically inside loadGrid() — model, page class, grid chrome,
// and the formula parser it pulls in — so `vitepress build` never executes
// it and readers who don't click never download a byte.
import { ref, shallowRef, type Component } from 'vue';
import { Reactive } from '../../../../../lib/Reactive';

class $FlyweightGrid20M {
  // MUTABLE STATE — the loaded component is replaced wholesale
  get gridApp() {
    return shallowRef<Component | null>(null);
  }
  get isLoading() {
    return ref(false);
  }
  get loadError() {
    return ref('');
  }

  // DERIVED — plain getters
  get isLoaded() {
    return this.gridApp.value !== null;
  }
  get hasError() {
    return this.loadError.value !== '';
  }
  get buttonLabel() {
    return this.isLoading.value ? 'Loading the code…' : 'Load the flyweight grid';
  }

  async loadGrid() {
    this.isLoading.value = true;
    this.loadError.value = '';
    try {
      const module = await import(
        '../../../../../examples/playground/src/examples/flyweight-grid/FlyweightGridApp.vue'
      );
      this.gridApp.value = module.default;
    } catch (error) {
      this.loadError.value = String(error);
    }
    this.isLoading.value = false;
  }
}

export namespace FlyweightGrid20M {
  export const $Class = $FlyweightGrid20M; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}

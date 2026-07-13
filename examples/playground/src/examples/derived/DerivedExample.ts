// DerivedExample.ts — the route's view state, in ivue: it hosts the Thermo
// instance and mirrors its plain-field run counters into refs the template
// can display (a plain-field write triggers nothing — that's the point the
// demo makes — so a post-flush watcher does the mirroring).
import { onMounted, ref, watch } from 'vue';
import { Reactive } from '../../ivue';
import { Thermo } from './Thermo';

class $DerivedExample {
  thermo = new Thermo.Class();

  // Unrelated state — changing it re-renders the demo without touching celsius.
  get ticks() {
    return ref(0);
  }
  get fahrenheitRunsShown() {
    return ref(0);
  }
  get statusRunsShown() {
    return ref(0);
  }

  constructor() {
    onMounted(() => this.startMirroring());
  }

  startMirroring() {
    this.syncRunCounters();
    watch(
      [() => this.thermo.celsius.value, () => this.ticks.value],
      () => this.syncRunCounters(),
      { flush: 'post' },
    );
  }

  syncRunCounters() {
    this.fahrenheitRunsShown.value = this.thermo.fahrenheitRuns;
    this.statusRunsShown.value = this.thermo.statusRuns;
  }

  reRender() {
    this.ticks.value++;
  }
}

export namespace DerivedExample {
  export const $Class = $DerivedExample; // raw — children `extends` this
  export const Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}

// DerivedExample.ts — the route's view state, in ivue: it hosts the Thermo
// instance, forwards the refs the template binds, and mirrors Thermo's
// plain-field run counters into refs the template can display (a
// plain-field write triggers nothing — that's the point the demo makes —
// so a post-flush watcher does the mirroring).
import { onMounted, ref, watch, type ComputedRef, type Ref } from 'vue';
import { Reactive } from '../../ivue';
import { Thermo } from './Thermo';

class $DerivedExample {
  constructor() {
    onMounted(() => this.startMirroring());
  }

  // HOSTED model — created on first touch, held for the life of the view
  protected get $thermo() {
    return new Thermo.Class();
  }

  /** The model, exposed for the template's dotted reads. */
  get thermo() {
    return this.$thermo;
  }

  // FORWARDED cells — the model's refs, so the SFC destructures ONE instance
  get celsius(): Ref<number> {
    return this.$thermo.celsius;
  }
  get status(): ComputedRef<string> {
    return this.$thermo.status;
  }

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

  // DERIVED — plain getters
  get fahrenheit() {
    return this.$thermo.fahrenheit;
  }
  get reRenderLabel() {
    return `re-render (${this.ticks.value})`;
  }

  startMirroring() {
    this.syncRunCounters();
    watch(
      [() => this.celsius.value, () => this.ticks.value],
      () => this.syncRunCounters(),
      { flush: 'post' },
    );
  }

  syncRunCounters() {
    this.fahrenheitRunsShown.value = this.$thermo.runs.fahrenheit;
    this.statusRunsShown.value = this.$thermo.runs.status;
  }

  reRender() {
    this.ticks.value++;
  }
}

export namespace DerivedExample {
  export const $Class = $DerivedExample; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}

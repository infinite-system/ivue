// Thermo.ts — plain getter vs computed(), side by side.
import { computed, ref } from 'vue';
import { Reactive } from '../../ivue';

class $Thermo {
  // Run counters are plain fields: incrementing them inside getter bodies is
  // side-effect-free for the graph (a plain-field write triggers nothing).
  fahrenheitRuns = 0;
  statusRuns = 0;

  get celsius() {
    return ref(21);
  }

  // Plain getter: re-derives on EVERY render — even unrelated ones.
  get fahrenheit() {
    this.fahrenheitRuns++;
    return Math.round((this.celsius.value * 9) / 5 + 32);
  }

  // computed(): memoized — its body runs only when celsius actually changed.
  get status() {
    return computed(() => this.deriveStatus());
  }

  deriveStatus() {
    this.statusRuns++;
    const celsius = this.celsius.value;
    if (celsius < 10) return 'Cold';
    if (celsius < 18) return 'Cool';
    if (celsius < 26) return 'Comfortable';
    return 'Warm';
  }
}

export namespace Thermo {
  export const $Class = $Thermo; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}

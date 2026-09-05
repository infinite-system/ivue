// Sensor.ts — the OUTLIVING shape: $watch registers in the instance's own
// lazily created effect scope, and the instance is started, suspended,
// resumed and disposed by hand. The onScopeDispose bridge in the
// constructor makes a component-owned Sensor ride unmount anyway.
import { getCurrentScope, onScopeDispose, ref, shallowRef } from 'vue';
import { Reactive, type ReactiveHelpers } from '../../ivue';

class $Sensor {
  constructor() {
    // The bridge: constructed inside a component, disposal rides its
    // unmount; constructed anywhere else, this line is a no-op and the
    // explicit owner calls dispose().
    getCurrentScope() && onScopeDispose(() => this.dispose());
  }

  // MUTABLE STATE
  get temp() {
    return ref(20);
  }
  get watching() {
    return ref(false);
  }
  get fired() {
    return ref(0);
  }
  get lastChange() {
    return ref('');
  }

  /** The handle of the one live watcher; null when none is registered. A
   *  ref like every other cell, so dispose()'s reset clears it too. */
  protected get stopWatcher() {
    return shallowRef<(() => void) | null>(null);
  }

  // DERIVED — plain getters
  get watchingLabel() {
    return this.watching.value ? 'ON' : 'off';
  }
  get lastChangeLabel() {
    return this.lastChange.value || '—';
  }

  start() {
    if (this.watching.value) return;
    this.watching.value = true;
    // $watch registers in the instance's lazy effect scope — allocated
    // now, on the first call, never before
    this.stopWatcher.value = this.$watch(
      () => this.temp.value,
      (newTemp: number, oldTemp: number) => this.onTempChanged(newTemp, oldTemp),
    );
  }

  stop() {
    this.stopWatcher.value?.();
    this.stopWatcher.value = null;
    this.watching.value = false;
  }

  /** Stop the watchers ONLY — `{ reset: false }` keeps every cached cell
   *  and its current value; start() resumes in a fresh scope. */
  suspend() {
    this.$stopEffects({ reset: false });
    this.stopWatcher.value = null;
    this.watching.value = false;
  }

  dispose() {
    // Write the initial values FIRST: a template that destructured these
    // refs keeps holding the pre-dispose cells, so this is what its
    // display shows after the reset. The engine reset then drops the
    // cells — the next access (a remount, a new consumer) materializes
    // fresh ones with these same initial values, so both worlds agree.
    this.watching.value = false;
    this.fired.value = 0;
    this.lastChange.value = '';
    this.temp.value = 20;
    this.stopWatcher.value = null;
    this.$stopEffects(); // stops the scope, clears every cached cell
  }

  onTempChanged(newTemp: number, oldTemp: number) {
    this.fired.value++;
    this.lastChange.value = `${oldTemp} → ${newTemp}`;
  }
}

// The engine installs $watch / $stopEffects at Reactive(); merging its
// helpers gives the class body their types — one line, zero runtime.
interface $Sensor extends ReactiveHelpers {}

export namespace Sensor {
  export const $Class = $Sensor; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}

// Sensor.ts — $watch and $stopEffects on an instance you control by hand.
import { ref } from 'vue';
import { Reactive } from '../../ivue';

class $Sensor {
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

  #stopWatch?: () => void;

  start() {
    if (this.watching.value) return;
    this.watching.value = true;
    // $watch registers in the instance's lazy effect scope
    this.#stopWatch = (this as any).$watch(
      () => this.temp.value,
      (newTemp: number, oldTemp: number) => this.onTempChanged(newTemp, oldTemp),
    );
  }

  stop() {
    this.#stopWatch?.();
    this.#stopWatch = undefined;
    this.watching.value = false;
  }

  /** Stop the watchers ONLY — `{ reset: false }` keeps every cached cell
   *  and its current value; start() resumes in a fresh scope. */
  suspend() {
    (this as any).$stopEffects({ reset: false });
    this.#stopWatch = undefined;
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
    (this as any).$stopEffects(); // stops the scope, clears every cached cell
  }

  onTempChanged(newTemp: number, oldTemp: number) {
    this.fired.value++;
    this.lastChange.value = `${oldTemp} → ${newTemp}`;
  }
}

export namespace Sensor {
  export const $Class = $Sensor; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}

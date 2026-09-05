// Ticker.ts — the COMPONENT-LIFETIME shape: the constructor runs inside
// setup, so plain watch() and the lifecycle hooks register against the
// mounting component and unmount reaps them. Nothing here needs
// $stopEffects — Vue owns the lifetime. Non-Vue resources (the interval)
// are released by an ordinary method the unmount hook delegates to.
import { onMounted, onUnmounted, ref, shallowRef, watch } from 'vue';
import { Reactive } from '../../ivue';

class $Ticker {
  constructor() {
    // plain watch — lands in the COMPONENT's scope, reaped on unmount
    watch(
      () => this.ticks.value,
      (ticks) => this.onTick(ticks),
    );
    // lifecycle hooks — register against the mounting component
    onMounted(() => this.startTicking());
    onUnmounted(() => this.dispose());
  }

  // MUTABLE STATE
  get ticks() {
    return ref(0);
  }
  get running() {
    return ref(false);
  }
  get crossings() {
    return ref(0);
  }

  // A non-Vue resource's handle: the engine cannot release it, so a
  // method does — no reserved names, no hooks, nothing auto-called.
  protected get interval() {
    return shallowRef<ReturnType<typeof setInterval> | null>(null);
  }

  // DERIVED — plain getters
  get runningLabel() {
    return this.running.value ? 'ON' : 'off';
  }
  get isAtThreshold() {
    return this.ticks.value % 5 === 0 && this.ticks.value > 0;
  }

  startTicking() {
    if (this.interval.value) return;
    this.running.value = true;
    this.interval.value = setInterval(() => this.tick(), 700);
  }

  stopTicking() {
    if (this.interval.value) clearInterval(this.interval.value);
    this.interval.value = null;
    this.running.value = false;
  }

  tick() {
    this.ticks.value++;
  }

  toggle() {
    if (this.running.value) this.stopTicking();
    else this.startTicking();
  }

  /** Every fifth tick is a "crossing" — the plain watch above delivers it. */
  onTick(ticks: number) {
    if (ticks % 5 === 0) this.crossings.value++;
  }

  /** Richer cleanup: release the timer FIRST, while state is still alive.
   *  The component's unmount hook delegates here; there is no engine
   *  scope to stop because every effect belongs to the component. */
  dispose() {
    this.stopTicking();
  }
}

export namespace Ticker {
  export const $Class = $Ticker; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}

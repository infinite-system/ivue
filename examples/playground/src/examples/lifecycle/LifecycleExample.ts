// LifecycleExample.ts — the route's ONE model. It hosts both lifetimes
// behind `$`-getters and forwards the refs its template reads, the same
// refine-don't-forward surface a class puts over a composable.
import type { Ref } from 'vue';
import { Reactive } from '../../ivue';
import { Sensor } from './Sensor';
import { Ticker } from './Ticker';

class $LifecycleExample {
  constructor() {
    // First touch INSIDE setup on purpose: Ticker's constructor registers
    // plain watch() and lifecycle hooks, and those must land in the
    // component's scope. Sensor bridges to the same scope on its own.
    void this.$ticker;
    void this.$sensor;
  }

  // COMPONENT-LIFETIME model — the composable-style `$`-getter: created
  // once, on first touch, cached for the life of this instance
  protected get $ticker() {
    return new Ticker.Class();
  }

  // OUTLIVING model — same seam
  protected get $sensor() {
    return new Sensor.Class();
  }

  // The refs the template binds — FORWARDED, so the SFC destructures ONE
  // instance. A getter returning another instance's Ref is that same cell
  // (identity intact); the `Ref<…>` annotation is how the class says so.
  get ticks(): Ref<number> {
    return this.$ticker.ticks;
  }
  get crossings(): Ref<number> {
    return this.$ticker.crossings;
  }
  get temp(): Ref<number> {
    return this.$sensor.temp;
  }
  get fired(): Ref<number> {
    return this.$sensor.fired;
  }

  // DERIVED — the template's labels and classes, named
  get runningLabel() {
    return this.$ticker.runningLabel;
  }
  get runningClass() {
    return this.$ticker.running.value ? 'grad' : '';
  }
  get toggleLabel() {
    return this.$ticker.running.value ? 'pause' : 'resume';
  }
  get watchingLabel() {
    return this.$sensor.watchingLabel;
  }
  get watchingClass() {
    return this.$sensor.watching.value ? 'grad' : '';
  }
  get lastChangeLabel() {
    return this.$sensor.lastChangeLabel;
  }

  // ACTIONS — delegated to the model that owns them
  toggleTicker() {
    this.$ticker.toggle();
  }

  startWatch() {
    this.$sensor.start();
  }

  stopWatch() {
    this.$sensor.stop();
  }

  suspendSensor() {
    this.$sensor.suspend();
  }

  disposeSensor() {
    this.$sensor.dispose();
  }
}

export namespace LifecycleExample {
  export const $Class = $LifecycleExample; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}

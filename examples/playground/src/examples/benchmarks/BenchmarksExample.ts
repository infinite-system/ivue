// BenchmarksExample.ts — the benchmarks route's own state, in ivue.
import { ref } from 'vue';
import { Reactive } from '../../ivue';
import { Static } from '../../Static';
import {
  INSTANCE_COUNT,
  benchIvue,
  benchReactive,
  benchComposable,
} from './creationBench';

class $BenchmarksExample {
  static readonly CALL_COUNT = 200_000;

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $BenchmarksExample;
  }

  get callCountLabel() {
    return this.self.CALL_COUNT.toLocaleString();
  }
  get instanceCountLabel() {
    return INSTANCE_COUNT.toLocaleString();
  }
  get hasIvueResult() {
    return this.ivueMs.value !== null;
  }
  get hasReactiveResult() {
    return this.reactiveMs.value !== null;
  }
  get hasComposableResult() {
    return this.composableMs.value !== null;
  }
  get creationButtonLabel() {
    if (this.running.value) return 'Running…';
    return this.hasIvueResult ? 'Run again' : `Create ${this.instanceCountLabel} instances`;
  }
  get boxButtonLabel() {
    if (this.boxRunning.value) return 'Running…';
    return this.boxCreationMs.value === null ? 'Run the hierarchy benchmark' : 'Run again';
  }

  get ivueMs() {
    return ref<number | null>(null);
  }
  get reactiveMs() {
    return ref<number | null>(null);
  }
  get composableMs() {
    return ref<number | null>(null);
  }
  get running() {
    return ref(false);
  }

  get boxCreationMs() {
    return ref<number | null>(null);
  }
  get methodMs() {
    return ref<number | null>(null);
  }
  get boxRunning() {
    return ref(false);
  }

  async runCreation() {
    this.running.value = true;
    this.ivueMs.value = this.reactiveMs.value = this.composableMs.value = null;
    // let the button paint before blocking
    await this.nextTick();
    this.ivueMs.value = benchIvue();
    await this.nextTick();
    this.reactiveMs.value = benchReactive();
    await this.nextTick();
    this.composableMs.value = benchComposable();
    this.running.value = false;
  }

  async runInteractiveBox() {
    this.boxRunning.value = true;
    await this.nextTick();
    const { InteractiveBox } = await import('./model/InteractiveBox');

    // 1. creation — instances retained in an array, nothing elidable
    const instances = new Array(INSTANCE_COUNT);
    const creationStart = performance.now();
    for (let index = 0; index < INSTANCE_COUNT; index++) {
      instances[index] = new InteractiveBox.Class({ id: index });
    }
    this.boxCreationMs.value = performance.now() - creationStart;
    let alive = 0;
    for (let index = 0; index < INSTANCE_COUNT; index += 997) {
      if (instances[index]) alive++;
    }
    if (alive < 0) throw new Error('unreachable');

    // 2. method dispatch — one instance, a prototype-bound method, N calls
    const benchmarkInstance = instances[0];
    const methodStart = performance.now();
    for (let index = 0; index < this.self.CALL_COUNT; index++) {
      benchmarkInstance.calculatePhysics();
    }
    this.methodMs.value = performance.now() - methodStart;
    this.boxRunning.value = false;
  }

  nextTick() {
    return new Promise((resolve) => setTimeout(resolve, 30));
  }

  format(value: number | null) {
    return value === null ? '—' : `${value.toFixed(1)} ms`;
  }

  ratio(value: number | null) {
    return value === null || this.ivueMs.value === null || this.ivueMs.value === 0
      ? ''
      : `${(value / this.ivueMs.value).toFixed(1)}× slower`;
  }
}

export namespace BenchmarksExample {
  export const $Class = Static($BenchmarksExample); // anchor — it declares statics // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}

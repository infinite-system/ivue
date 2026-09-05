// CreationBench.ts — the primitives benchmark's model. The InteractiveBox
// hierarchy is imported dynamically on first run from the playground's
// `benchmarks` example, unchanged; nothing executes at build or on load.
import { ref } from 'vue';
import { Reactive } from '../../../../lib/Reactive';
import { Static } from '../../../../lib/Static';

class $CreationBench {
  static readonly INSTANCE_COUNT = 100_000;
  static readonly CALL_COUNT = 200_000;

  // MUTABLE STATE
  get creationMs() {
    return ref<number | null>(null);
  }
  get methodMs() {
    return ref<number | null>(null);
  }
  get isRunning() {
    return ref(false);
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $CreationBench;
  }

  // DERIVED — plain getters
  get instanceCountLabel() {
    return this.self.INSTANCE_COUNT.toLocaleString();
  }
  get callCountLabel() {
    return this.self.CALL_COUNT.toLocaleString();
  }
  get creationLabel() {
    return this.format(this.creationMs.value);
  }
  get methodLabel() {
    return this.format(this.methodMs.value);
  }
  get buttonLabel() {
    if (this.isRunning.value) return 'Running…';
    return this.creationMs.value === null ? 'Run the benchmark' : 'Run again';
  }

  async runBench() {
    this.isRunning.value = true;
    await new Promise((resolve) => setTimeout(resolve, 30)); // let the button paint
    const { InteractiveBox } = await import(
      '../../../../examples/playground/src/examples/benchmarks/model/InteractiveBox'
    );
    const { INSTANCE_COUNT, CALL_COUNT } = this.self;

    // 1. creation — instances retained in an array, nothing elidable
    const instances = new Array(INSTANCE_COUNT);
    const creationStart = performance.now();
    for (let index = 0; index < INSTANCE_COUNT; index++) {
      instances[index] = new InteractiveBox.Class({ id: index });
    }
    this.creationMs.value = performance.now() - creationStart;
    let alive = 0;
    for (let index = 0; index < INSTANCE_COUNT; index += 997) if (instances[index]) alive++;
    if (alive < 0) throw new Error('unreachable');

    // 2. method dispatch — one instance, a prototype-bound method, N calls
    const benchmarkInstance = instances[0];
    const methodStart = performance.now();
    for (let index = 0; index < CALL_COUNT; index++) {
      benchmarkInstance.calculatePhysics();
    }
    this.methodMs.value = performance.now() - methodStart;
    this.isRunning.value = false;
  }

  format(milliseconds: number | null) {
    return milliseconds === null ? '—' : milliseconds.toFixed(1) + ' ms';
  }
}

export namespace CreationBench {
  export const $Class = Static($CreationBench); // anchor — it declares statics
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}

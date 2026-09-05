// DemoPerf.ts — the creation benchmark demo's model: three timings, a
// running flag, and the labels the template shows.
import { ref } from 'vue';
import { Reactive } from '../../../../lib/Reactive';
import {
  benchComposable,
  benchIvue,
  benchReactive,
} from '../../../../examples/playground/src/examples/benchmarks/creationBench';

class $DemoPerf {
  // MUTABLE STATE
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

  // DERIVED — plain getters
  get hasIvueResult() {
    return this.ivueMs.value !== null;
  }
  get hasReactiveResult() {
    return this.reactiveMs.value !== null;
  }
  get hasComposableResult() {
    return this.composableMs.value !== null;
  }
  get ivueLabel() {
    return this.format(this.ivueMs.value);
  }
  get reactiveLabel() {
    return this.format(this.reactiveMs.value);
  }
  get composableLabel() {
    return this.format(this.composableMs.value);
  }
  get reactiveRatio() {
    return this.ratio(this.reactiveMs.value);
  }
  get composableRatio() {
    return this.ratio(this.composableMs.value);
  }
  get buttonLabel() {
    if (this.running.value) return 'Running…';
    return this.hasIvueResult ? 'Run again' : 'Run the benchmark';
  }

  async run() {
    this.running.value = true;
    this.ivueMs.value = this.reactiveMs.value = this.composableMs.value = null;
    // let the button paint before blocking
    await this.nextPaint();
    this.ivueMs.value = benchIvue();
    await this.nextPaint();
    this.reactiveMs.value = benchReactive();
    await this.nextPaint();
    this.composableMs.value = benchComposable();
    this.running.value = false;
  }

  nextPaint() {
    return new Promise((resolve) => setTimeout(resolve, 30));
  }

  format(milliseconds: number | null) {
    return milliseconds === null ? '·' : `${milliseconds.toFixed(1)} ms`;
  }

  ratio(milliseconds: number | null) {
    const base = this.ivueMs.value;
    if (milliseconds === null || base === null || base === 0) return '';
    return `${(milliseconds / base).toFixed(1)}× slower`;
  }
}

export namespace DemoPerf {
  export const $Class = $DemoPerf; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}

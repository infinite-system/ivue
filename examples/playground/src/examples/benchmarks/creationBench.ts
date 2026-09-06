// creationBench.ts — the in-browser creation benchmark: same shape three
// ways (ivue class, reactive(new X()), composable factory), retained-array
// harness so the JIT cannot elide the allocations.
import { computed, reactive, ref } from 'vue';
import { Box } from './Box';

export class PlainBox {
  width = 1;
  height = 2;
  get area() {
    return this.width * this.height;
  }
}

export const useBox = () => {
  const width = ref(1);
  const height = ref(2);
  const area = computed(() => width.value * height.value);
  return { width, height, area };
};

export const INSTANCE_COUNT = 100_000;

// Every instance is retained in a pre-allocated array and touched after
// timing — the JIT cannot elide the allocations (a discarded `sink = ...`
// loop gets optimized away and reports fantasy numbers like 0.0 ms).
export function bench(make: () => unknown): number {
  const instances = new Array(INSTANCE_COUNT);
  const start = performance.now();
  for (let index = 0; index < INSTANCE_COUNT; index++) {
    instances[index] = make();
  }
  const elapsed = performance.now() - start;
  let alive = 0;
  for (let index = 0; index < INSTANCE_COUNT; index += 997) {
    if (instances[index]) alive++;
  }
  if (alive < 0) throw new Error('unreachable');
  return elapsed;
}

export const benchIvue = () => bench(() => new Box.Class());
export const benchReactive = () => bench(() => reactive(new PlainBox()));
export const benchComposable = () => bench(() => useBox());

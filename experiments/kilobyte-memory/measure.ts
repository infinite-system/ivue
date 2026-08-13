// Measures what a freshly constructed InteractiveBox actually weighs.
// The blog claim: after `new`, an instance holds ONE own property (id) —
// every other member is a prototype getter, zero bytes until first read.
// So 100k instances should weigh the same as 100k plain `{ id }` objects.
//   NODE_OPTIONS=--expose-gc npx vite-node experiments/kilobyte-memory/measure.ts
import { InteractiveBox } from '../../examples/playground/src/examples/benchmarks/model/InteractiveBox';

declare const gc: () => void;

const INSTANCE_COUNT = 100_000;

function settleHeap(): number {
  gc();
  gc();
  return process.memoryUsage().heapUsed;
}

function measure(label: string, create: (index: number) => unknown): number {
  const holder = new Array(INSTANCE_COUNT);
  const before = settleHeap();
  for (let index = 0; index < INSTANCE_COUNT; index++) {
    holder[index] = create(index);
  }
  const after = settleHeap();
  const perInstance = (after - before) / INSTANCE_COUNT;
  console.log(
    `${label}: ${((after - before) / 1024 / 1024).toFixed(2)} MB total, ` +
      `${perInstance.toFixed(1)} bytes/instance`,
  );
  // keep the holder alive past the final heap sample
  if (holder.length !== INSTANCE_COUNT) throw new Error('unreachable');
  return perInstance;
}

const plainBytes = measure('plain { id }        ', (index) => ({ id: index }));
const ivueBytes = measure(
  'new InteractiveBox  ',
  (index) => new InteractiveBox.Class({ id: index }),
);
console.log(
  `ratio: ${(ivueBytes / plainBytes).toFixed(2)}x the plain object`,
);

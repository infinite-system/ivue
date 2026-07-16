import { performance } from 'node:perf_hooks';
import { Static } from './Static';

const callCount = Number(process.env.CALLS ?? 20_000_000);
const roundCount = Number(process.env.ROUNDS ?? 45);
const classCount = Number(process.env.CLASSES ?? 50_000);

function mix(value: number, input: number) {
  return (Math.imul(value ^ input, 1_664_525) + 1_013_904_223) | 0;
}

class $NativeService {
  static value = 1;

  static calculate(input: number) {
    return (this.value = mix(this.value, input));
  }
}

class $SelectedService {
  static value = 1;

  static calculate(input: number) {
    return (this.value = mix(this.value, input));
  }
}

const SelectedService = Static($SelectedService);
const detachedCalculate = SelectedService.calculate;

function callNative(size: number) {
  $NativeService.value = 1;
  for (let index = 0; index < size; index++) {
    $NativeService.calculate(index);
  }
  return $NativeService.value;
}

function callSelected(size: number) {
  SelectedService.value = 1;
  for (let index = 0; index < size; index++) {
    SelectedService.calculate(index);
  }
  return SelectedService.value;
}

function callDetached(size: number) {
  SelectedService.value = 1;
  for (let index = 0; index < size; index++) {
    detachedCalculate(index);
  }
  return SelectedService.value;
}

const variants = [
  ['native dotted static', callNative],
  ['Static() dotted method', callSelected],
  ['Static() detached method', callDetached],
] as const;

let checksum = 0;
for (let warmup = 0; warmup < 8; warmup++) {
  for (const [, run] of variants) checksum ^= run(500_000);
}

const samples = new Map(variants.map(([name]) => [name, [] as number[]]));
for (let round = 0; round < roundCount; round++) {
  for (let offset = 0; offset < variants.length; offset++) {
    const [name, run] = variants[(round + offset) % variants.length];
    const startedAt = performance.now();
    checksum ^= run(callCount);
    samples.get(name)!.push(performance.now() - startedAt);
  }
}

function median(values: number[]) {
  const sortedValues = [...values].sort((left, right) => left - right);
  return sortedValues[Math.floor((sortedValues.length - 1) / 2)];
}

const steadyState = variants.map(([name]) => {
  const duration = median(samples.get(name)!);
  return {
    name,
    medianMilliseconds: Number(duration.toFixed(3)),
    nanosecondsPerCall: Number(
      ((duration * 1_000_000) / callCount).toFixed(3),
    ),
  };
});

const rawClasses = Array.from(
  { length: classCount },
  () =>
    class {
      static method() {
        return this;
      }
    },
);

let startedAt = performance.now();
const selectedClasses = rawClasses.map((RawClass) => Static(RawClass));
const transformDuration = performance.now() - startedAt;

startedAt = performance.now();
for (const SelectedClass of selectedClasses) {
  const method = SelectedClass.method;
  checksum ^= Number(method() === SelectedClass);
}
const firstReadDuration = performance.now() - startedAt;

console.log(
  JSON.stringify(
    {
      node: process.version,
      v8: process.versions.v8,
      callCount,
      roundCount,
      classCount,
      checksum,
      steadyState,
      oneTime: {
        transformNanosecondsPerClass: Number(
          ((transformDuration * 1_000_000) / classCount).toFixed(1),
        ),
        firstReadNanosecondsPerClass: Number(
          ((firstReadDuration * 1_000_000) / classCount).toFixed(1),
        ),
      },
    },
    null,
    2,
  ),
);

import { bench, describe } from 'vitest';
import { V2, useBox, makePlain } from './models';

const N = 10000; // method calls per op (reads reactive state each call)

// One instance each; the loop hammers a method that reads state.
const v2 = new V2() as any;
const box = useBox();
const plain = makePlain() as any;

describe(`${N} method calls that read state`, () => {
  bench('native   · composable fn (direct ref read)', () => {
    let s = 0;
    for (let i = 0; i < N; i++) s += box.w.value * box.h.value;
    if (s < 0) throw 0;
  });

  bench('native   · plain method (baseline)', () => {
    let s = 0;
    for (let i = 0; i < N; i++) s += plain.w * plain.h;
    if (s < 0) throw 0;
  });

  bench('ivue v2  · this.x.value (getter indirection)', () => {
    let s = 0;
    for (let i = 0; i < N; i++) s += v2.w.value * v2.h.value;
    if (s < 0) throw 0;
  });

  bench('ivue v2  · hoisted (const w = this.w)', () => {
    let s = 0;
    const w = v2.w, h = v2.h; // hoist the getter once — now direct ref reads
    for (let i = 0; i < N; i++) s += w.value * h.value;
    if (s < 0) throw 0;
  });
});

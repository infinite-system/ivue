import { bench, describe } from 'vitest';
import { V2, makeV1, useBox, makeReactive } from './models';

const N = 1000; // construct + read one computed, per op

describe(`construct + first .area read (${N})`, () => {
  bench('ivue v2  · new + area.value', () => {
    let s = 0;
    for (let i = 0; i < N; i++) { const o: any = new V2(); s += o.area.value; }
    if (s < 0) throw 0;
  });

  bench('native   · reactive + area', () => {
    let s = 0;
    for (let i = 0; i < N; i++) { const o: any = makeReactive(); s += o.area; }
    if (s < 0) throw 0;
  });

  bench('native   · composable + area.value', () => {
    let s = 0;
    for (let i = 0; i < N; i++) { const o = useBox(); s += o.area.value; }
    if (s < 0) throw 0;
  });

  bench('ivue v1  · ivue + area', () => {
    let s = 0;
    for (let i = 0; i < N; i++) { const o: any = makeV1(); s += o.area; }
    if (s < 0) throw 0;
  });
});

import { bench, describe } from 'vitest';
import { Deep } from './models';

const N = 1000;

describe(`deep 4-level hierarchy (${N})`, () => {
  bench('create only', () => {
    for (let i = 0; i < N; i++) new Deep();
  });

  bench('create + resolve super chain (tag.value)', () => {
    let s = 0;
    for (let i = 0; i < N; i++) { const o: any = new Deep(); s += o.tag.value.length; }
    if (s < 0) throw 0;
  });

  bench('create + child computed over ancestor refs (sum.value)', () => {
    let s = 0;
    for (let i = 0; i < N; i++) { const o: any = new Deep(); s += o.sum.value; }
    if (s < 0) throw 0;
  });
});

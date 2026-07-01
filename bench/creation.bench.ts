import { bench, describe } from 'vitest';
import { V2, makeV1, useBox, makeReactive, makePlain } from './models';

const N = 1000; // instances created per op

describe(`create ${N} instances (no access)`, () => {
  bench('ivue v2  · new Class()', () => {
    for (let i = 0; i < N; i++) new V2();
  });

  bench('native   · plain new (baseline)', () => {
    for (let i = 0; i < N; i++) makePlain();
  });

  bench('native   · reactive(new X())', () => {
    for (let i = 0; i < N; i++) makeReactive();
  });

  bench('native   · composable factory', () => {
    for (let i = 0; i < N; i++) useBox();
  });

  bench('ivue v1  · ivue(Class)', () => {
    for (let i = 0; i < N; i++) makeV1();
  });
});

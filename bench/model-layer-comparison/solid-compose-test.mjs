// Solid has no classes, so there is no "does inheritance compose" question
// in the same shape as Angular/MobX/Svelte/vanilla/ivue. Composition
// happens by calling one factory function from another and reading its
// return value — ordinary function composition, not `extends`/`super`.
// Because tracking is based on which signals are actually read (not on
// any class or getter mechanism), it composes correctly by construction —
// there is no clobbering risk because there is nothing to clobber.
// Run with: node --conditions=browser solid-compose-test.mjs

import { createSignal, createMemo, createRoot } from 'solid-js';

createRoot(() => {
  function createBase() {
    const [a, setA] = createSignal(1);
    const total = createMemo(() => a() + 10);
    return { a, setA, total };
  }
  function createSub() {
    const base = createBase();
    const [b, setB] = createSignal(2);
    const total = createMemo(() => base.total() + b() + 100);
    return { ...base, b, setB, total };
  }

  const s = createSub();
  console.log('s.total() =', s.total(), '(expect 113 = 1 + 10 + 2 + 100)');
  s.setA(5);
  console.log(
    'after setA(5):',
    s.total(),
    '(expect 117 — correct, by construction: no class to clobber)',
  );
});

// Does Svelte 5's $state/$derived compose correctly across inheritance?
// The compiler lowers each rune field to a private backing field PLUS a
// real prototype getter/setter (see svelte-inherit.compiled.mjs) — so,
// unlike Angular's raw fields, super.total genuinely resolves through a
// live reactive derivation, not a clobbered own-property.
// Run with: node svelte-inherit-test.mjs

import { Sub } from './svelte-inherit.compiled.mjs';

const s = new Sub();
console.log('s.total =', s.total, '(expect 113 = 1 + 10 + 2 + 100)');
s.a = 5;
console.log(
  'after s.a = 5, s.total =',
  s.total,
  '(expect 117 — correctly re-derived through super.total, not stale)',
);

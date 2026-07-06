// Regenerates the compiled .mjs output from the .svelte.js rune sources.
// Committed compiled output is checked in (deterministic given the compiler
// version pinned in package.json) so `npm run bench`/inherit tests don't
// need to invoke the compiler at run time — but re-run this after editing
// either .svelte.js source. Run with: node compile-svelte.mjs

import { compileModule } from 'svelte/compiler';
import { readFileSync, writeFileSync } from 'fs';

for (const name of ['svelte-cell', 'svelte-inherit']) {
  const src = readFileSync(`${name}.svelte.js`, 'utf8');
  const out = compileModule(src, {
    filename: `${name}.svelte.js`,
    generate: 'client',
  });
  writeFileSync(`${name}.compiled.mjs`, out.js.code);
  console.log(`compiled ${name}.svelte.js -> ${name}.compiled.mjs`);
}

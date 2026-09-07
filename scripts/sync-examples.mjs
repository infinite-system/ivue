import { copyFileSync } from 'node:fs';

// StackBlitz imports only the playground directory. Keep both helpers and
// their shared implementation beside the vendored reactive engine.
for (const [source, target] of [
  ['Reactive', 'ivue'], ['nestedProps', 'nestedProps'], ['clone', 'clone'],
]) {
  copyFileSync(
    new URL(`../lib/${source}.ts`, import.meta.url),
    new URL(`../examples/playground/src/${target}.ts`, import.meta.url),
  );
}

import { build } from 'vite';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

// Independent bundles keep the shared copier inline in each entry and keep
// extras free of Vue. There is one source implementation, no shared JS chunk.
for (const entry of ['index', 'extras']) {
  const result = await build({
    build: { emptyOutDir: entry === 'index', lib: { entry: `./lib/${entry}.ts` } },
  });
  for (const output of Array.isArray(result) ? result : [result]) {
    for (const chunk of output.output) {
      if (chunk.type !== 'chunk') continue;
      const unexpectedImports = chunk.imports.filter(name => entry !== 'index' || name !== 'vue');
      if (!chunk.isEntry || unexpectedImports.length || chunk.dynamicImports.length) {
        throw new Error(`${entry} must be self-contained${entry === 'index' ? ' apart from Vue' : ''}`);
      }
    }
  }
}

const coreBytes = gzipSync(readFileSync(new URL('../dist/index.es.js', import.meta.url))).length;
// The existing core was 1,134 bytes; keep the complete entry within that budget.
if (coreBytes > 1134) throw new Error(`Core exceeds 1,134 gzip bytes: ${coreBytes}`);
console.log(`Core: ${coreBytes} bytes gzipped (budget: 1,134).`);

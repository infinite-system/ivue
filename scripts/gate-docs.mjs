// gate-docs.mjs — the docs build's standard gate, deploy-aware.
//
// `npm run build:docs` runs the ivue standard gate over the docs components
// and the playground before building. The gate needs the ROOT toolchain
// (vite-node, typescript, @vue/compiler-sfc). Cloudflare's deploy build
// installs only docs_v2's dependencies, so there the gate cannot run and
// must not fail the deploy: the same commit was already gated locally
// (build:docs before commit) and by CI (.github/workflows/ci.yml, which
// installs the root and runs this for real).
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const viteNode = join(root, 'node_modules', '.bin', 'vite-node');

if (!existsSync(viteNode)) {
  console.log('gate:docs — skipped: root toolchain not installed (deploy build); the gate ran locally and in CI');
  process.exit(0);
}

const result = spawnSync(
  viteNode,
  [
    'skills/ivue/ivue-standards-check.ts',
    '--',
    '--source-root', 'docs_v2/.vitepress/theme/components',
    '--source-root', 'examples/playground/src',
    '--skip-list', 'skills/ivue/ivue-docs-skip.json',
  ],
  { cwd: root, stdio: 'inherit' },
);
process.exit(result.status ?? 1);

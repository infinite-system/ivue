// Push the built docs_v2 site (docs_v2/.vitepress/dist) to the gh-pages
// branch as an orphan commit. Run from the REPO ROOT, after `npm run
// build:docs`. Node built-ins only — no dependencies.
import { execSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const DIST = 'docs_v2/.vitepress/dist';
const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

/**
 * APPEND-ONLY ASSETS. Every deploy used to replace the whole site, deleting
 * the previous build's content-hashed chunks — so a tab loaded before the
 * deploy 404'd on its next lazy import (the in-page recovery script rescues
 * it, but the break is preventable). Content hashes cannot collide, so the
 * previous deployment's assets are carried forward next to the new build:
 * an old tab keeps resolving its chunks indefinitely and simply picks up
 * the new site on its next natural reload. `asset-retention.json` records
 * when each carried file was first seen; files absent from the current
 * build for longer than RETAIN_DAYS age out, keeping the branch bounded.
 */
const RETAIN_DAYS = 14;
const MANIFEST = 'asset-retention.json';

export function listNewAssets(dist = DIST) {
  const assetsDir = join(dist, 'assets');
  if (!existsSync(assetsDir)) return [];
  return readdirSync(assetsDir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) =>
      join('assets', entry.parentPath.slice(assetsDir.length + 1), entry.name)
        .split('\\')
        .join('/'),
    );
}

export function mergePreviousAssets(dist = DIST) {
  try {
    execSync('git fetch origin gh-pages --depth=1', { stdio: 'inherit' });
  } catch {
    console.log('No gh-pages branch yet — nothing to carry forward.');
    return;
  }

  let previousManifest = {};
  try {
    previousManifest = JSON.parse(
      execSync(`git show origin/gh-pages:${MANIFEST}`, { encoding: 'utf8' }),
    );
  } catch {
    // first deploy with retention — every carried file starts its clock now
  }

  let previousAssets = [];
  try {
    previousAssets = execSync(
      'git ls-tree -r --name-only origin/gh-pages -- assets',
      { encoding: 'utf8' },
    )
      .split('\n')
      .filter(Boolean);
  } catch {
    return;
  }

  const now = Date.now();
  const cutoff = now - RETAIN_DAYS * 24 * 60 * 60 * 1000;
  const manifest = {};

  // the current build's own assets are always fresh
  for (const file of listNewAssets(dist)) manifest[file] = now;

  let carried = 0;
  let expired = 0;
  for (const file of previousAssets) {
    if (manifest[file] !== undefined) continue; // re-emitted by this build
    const firstSeen = previousManifest[file] ?? now;
    if (firstSeen < cutoff) {
      expired++;
      continue;
    }
    // restore the previous deployment's file byte-for-byte
    const target = join(dist, file);
    mkdirSync(dirname(target), { recursive: true });
    const bytes = execSync(`git show "origin/gh-pages:${file}"`, {
      maxBuffer: 64 * 1024 * 1024,
    });
    writeFileSync(target, bytes);
    manifest[file] = firstSeen;
    carried++;
  }

  writeFileSync(join(dist, MANIFEST), JSON.stringify(manifest));
  console.log(
    `Carried ${carried} previous asset(s) forward; ${expired} aged out.`,
  );
}

// Importable for tests; the deploy sequence runs only when executed
// directly (the merge is exercised without ever pushing).
const executedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (executedDirectly) {
if (!existsSync(`${DIST}/index.html`)) {
  console.error(`No build found at ${DIST} — run \`npm run build:docs\` first.`);
  process.exit(1);
}

// GitHub Pages runs Jekyll by default, which drops _-prefixed paths.
writeFileSync(`${DIST}/.nojekyll`, '');

mergePreviousAssets();

run('git checkout --orphan gh-pages');
run(`git --work-tree ${DIST} add --all`);
run(`git --work-tree ${DIST} commit -m gh-pages`);
run('git push origin HEAD:gh-pages --force');

// Restore the working branch (matters for local runs; harmless in CI).
run(`rm -r ${DIST}`);
run('git checkout -f main');
run('git branch -D gh-pages');

console.log('Deployed docs_v2 to gh-pages.');
}

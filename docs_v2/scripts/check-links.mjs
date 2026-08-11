// Broken-link scanner over the BUILT site: walks every dist HTML file,
// extracts internal href/src targets, and verifies each resolves to a
// built page or asset — including #anchors, which VitePress never checks.
// Runs as part of build:docs, so a broken link fails the build (locally
// and on the deploy pipeline) instead of shipping.
//   node docs_v2/scripts/check-links.mjs
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const distDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../.vitepress/dist',
);

if (!existsSync(distDirectory)) {
  console.error('check-links: dist not found — run the docs build first');
  process.exit(1);
}

const htmlFiles = [];
(function walk(directory) {
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    if (statSync(fullPath).isDirectory()) walk(fullPath);
    else if (entry.endsWith('.html')) htmlFiles.push(fullPath);
  }
})(distDirectory);

// pathname -> file on disk, honoring cleanUrls
function resolveTarget(pathname) {
  const decoded = decodeURIComponent(pathname).replace(/\/+$/, '');
  const candidates = decoded
    ? [decoded, `${decoded}.html`, `${decoded}/index.html`]
    : ['index.html'];
  for (const candidate of candidates) {
    const fullPath = join(distDirectory, candidate);
    if (existsSync(fullPath)) return fullPath;
  }
  return null;
}

const anchorCache = new Map();
function pageHasAnchor(file, anchor) {
  if (!anchorCache.has(file)) {
    const html = readFileSync(file, 'utf8');
    const ids = new Set(
      [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]),
    );
    anchorCache.set(file, ids);
  }
  return anchorCache.get(file).has(anchor);
}

const linkPattern = /\s(?:href|src)="([^"]+)"/g;
const failures = [];
let checkedCount = 0;

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const page = file.slice(distDirectory.length);
  for (const match of html.matchAll(linkPattern)) {
    const target = match[1];
    // external, protocol-relative, mail, and data links are out of scope
    if (/^(https?:)?\/\/|^(mailto|tel|data|javascript):/.test(target)) {
      continue;
    }
    // pure-hash link: a same-page anchor — verify against THIS page's ids
    if (target.startsWith('#')) {
      checkedCount++;
      const anchor = decodeURIComponent(target.slice(1));
      if (anchor && !pageHasAnchor(file, anchor)) {
        failures.push(`${page}: ${target} (same-page anchor missing)`);
      }
      continue;
    }
    if (!target.startsWith('/')) continue; // relative asset emitted by vite
    checkedCount++;
    const [pathAndQuery, anchor] = target.split('#');
    const pathname = pathAndQuery.split('?')[0];
    const resolved = resolveTarget(pathname);
    if (!resolved) {
      failures.push(`${page}: ${target} (no such page)`);
      continue;
    }
    if (anchor && resolved.endsWith('.html') && !pageHasAnchor(resolved, anchor)) {
      failures.push(`${page}: ${target} (anchor missing)`);
    }
  }
}

if (failures.length) {
  console.error(`check-links: ${failures.length} broken link(s):`);
  for (const failure of [...new Set(failures)]) console.error('  ' + failure);
  process.exit(1);
}
console.log(
  `check-links: ${checkedCount} internal links across ${htmlFiles.length} pages — all resolve`,
);

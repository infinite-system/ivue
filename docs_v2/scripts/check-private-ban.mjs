// The standard bans `private` (see /blog/ban-private): teaching code —
// playground examples, docs theme classes, and guide/example code
// fences — must model `protected`. This gate keeps the ban from
// drifting. Exempt: vendored code (lenis/), the blog (posts may
// exhibit the anti-pattern on purpose), and comment lines.
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const memberPosition = /^\s+private\b/;

const targets = [
  ...globSync('examples/playground/src/**/*.ts', { cwd: root }).filter(
    (p) => !p.includes('/lenis/'),
  ),
  ...globSync('docs_v2/.vitepress/theme/**/*.ts', { cwd: root }),
  ...globSync('docs_v2/guide/*.md', { cwd: root }),
  ...globSync('docs_v2/examples/*.md', { cwd: root }),
];

const findings = [];
for (const file of targets) {
  const lines = readFileSync(resolve(root, file), 'utf8').split('\n');
  lines.forEach((line, index) => {
    if (memberPosition.test(line)) findings.push(`${file}:${index + 1}: ${line.trim()}`);
  });
}

if (findings.length) {
  console.error(`check-private-ban: ${findings.length} private member(s) in teaching code — the standard bans private (protected instead; see /blog/ban-private):`);
  for (const finding of findings) console.error('  ' + finding);
  process.exit(1);
}
console.log(`check-private-ban: ${targets.length} files clean — no private members in teaching code`);

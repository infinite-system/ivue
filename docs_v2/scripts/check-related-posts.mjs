// Fails the build when any page's `relatedPosts` frontmatter names a
// slug that matches no blog post. The RelatedPosts component filters
// unknown slugs silently (a rename must not break rendering), so
// WITHOUT this check a typo'd or stale slug degrades to an invisible
// missing card — this turns that into a loud build error instead.
//   Chained into build:docs after check:links.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const docsRoot = resolve(scriptDirectory, '..');
const blogSlugs = new Set(
  readdirSync(resolve(docsRoot, 'blog'))
    .filter((entry) => entry.endsWith('.md') && entry !== 'index.md')
    .map((entry) => entry.slice(0, -3)),
);

function* markdownFiles(directory) {
  for (const entry of readdirSync(directory)) {
    if (entry.startsWith('.') || entry === 'node_modules' || entry === 'dist')
      continue;
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) yield* markdownFiles(path);
    else if (entry.endsWith('.md')) yield path;
  }
}

let pagesChecked = 0;
const failures = [];
for (const path of markdownFiles(docsRoot)) {
  const source = readFileSync(path, 'utf8');
  const match = source.match(/^relatedPosts:\s*\[([^\]]*)\]/m);
  if (!match) continue;
  pagesChecked += 1;
  for (const slug of match[1].split(',').map((part) => part.trim()).filter(Boolean)) {
    if (!blogSlugs.has(slug))
      failures.push(`${path.slice(docsRoot.length + 1)}: unknown slug "${slug}"`);
  }
}

if (failures.length) {
  console.error('check-related-posts: FAILED');
  for (const failure of failures) console.error('  ' + failure);
  process.exit(1);
}
console.log(
  `check-related-posts: ${pagesChecked} pages, every relatedPosts slug resolves`,
);

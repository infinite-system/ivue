// Fails the build when any page's `relatedPosts` frontmatter names a
// slug that matches no blog post. The RelatedPosts component filters
// unknown slugs silently (a rename must not break rendering), so
// WITHOUT this check a typo'd or stale slug degrades to an invisible
// missing card — this turns that into a loud build error instead.
//   Chained into build:docs after check:links.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { channelOf, channelOfSlug } from './channel-posts.mjs';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const docsRoot = resolve(scriptDirectory, '..');
const blogSlugs = new Set();
const channelSlugs = new Map(); // slug → channel
const failures = [];
for (const entry of readdirSync(resolve(docsRoot, 'blog'))) {
  if (!entry.endsWith('.md') || entry === 'index.md') continue;
  const slug = entry.slice(0, -3);
  const declared = channelOf(
    readFileSync(resolve(docsRoot, 'blog', entry), 'utf8'),
  );
  const prefixed = channelOfSlug(slug);
  // the frontmatter is the semantic owner, the prefix the human
  // convention — they must agree, or one mechanism excludes what the
  // other publishes
  if (declared && declared !== prefixed)
    failures.push(
      `blog/${entry}: channel "${declared}" needs the "${declared}-" slug prefix`,
    );
  if (!declared && prefixed)
    failures.push(
      `blog/${entry}: "${prefixed}-" prefix but no "channel: ${prefixed}" frontmatter`,
    );
  if (declared) channelSlugs.set(slug, declared);
  else blogSlugs.add(slug);
}

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
for (const path of markdownFiles(docsRoot)) {
  const source = readFileSync(path, 'utf8');
  const match = source.match(/^relatedPosts:\s*\[([^\]]*)\]/m);
  if (!match) continue;
  pagesChecked += 1;
  for (const slug of match[1].split(',').map((part) => part.trim()).filter(Boolean)) {
    if (channelSlugs.has(slug))
      failures.push(
        `${path.slice(docsRoot.length + 1)}: relatedPosts names channel post "${slug}" (404 in production)`,
      );
    else if (!blogSlugs.has(slug))
      failures.push(`${path.slice(docsRoot.length + 1)}: unknown slug "${slug}"`);
  }
}

// hard gate: a channel post that somehow reached the production build
// (a broken srcExclude, a renamed frontmatter key) fails loudly here
const distDirectory = resolve(docsRoot, '.vitepress/dist/blog');
if (existsSync(distDirectory)) {
  for (const slug of channelSlugs.keys()) {
    if (existsSync(join(distDirectory, `${slug}.html`)))
      failures.push(`dist contains channel post "${slug}" — srcExclude failed`);
  }
  const blogIndex = resolve(docsRoot, 'public/blog-index.json');
  if (existsSync(blogIndex)) {
    const catalogSlugs = new Set(
      JSON.parse(readFileSync(blogIndex, 'utf8')).map((post) => post.slug),
    );
    for (const slug of channelSlugs.keys()) {
      if (catalogSlugs.has(slug))
        failures.push(
          `blog-index.json contains channel post "${slug}" — the newsletter would drip it`,
        );
    }
  }
}

if (failures.length) {
  console.error('check-related-posts: FAILED');
  for (const failure of failures) console.error('  ' + failure);
  process.exit(1);
}
console.log(
  `check-related-posts: ${pagesChecked} pages, every relatedPosts slug resolves` +
    (channelSlugs.size
      ? `; ${channelSlugs.size} channel posts excluded from production`
      : ''),
);

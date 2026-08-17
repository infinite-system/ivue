// Emits docs_v2/public/blog-index.json — the machine-readable post
// catalog the newsletter Worker reads: drip order, subjects, and each
// post's COMPLETE email HTML (rendered by blog-email-renderer.mjs, the
// deterministic post → newsletter conversion). The Worker substitutes
// only the per-recipient {{UNSUBSCRIBE_URL}} placeholder.
// Deterministic from committed files, so it runs in every build,
// including shallow-clone deploys, and ships with the site at
// https://ivue.dev/blog-index.json.
//   npm run sync:blog-index   (chained into build:docs)
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPostsWithSource, renderEmail } from './blog-email-renderer.mjs';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(scriptDirectory, '../public/blog-index.json');

const posts = loadPostsWithSource(); // oldest first — the drip order
const catalog = posts.map((post) => ({
  slug: post.slug,
  title: post.title,
  description: post.description,
  url: post.url,
  date: post.date,
  timestamp: post.timestamp,
  emailHtml: renderEmail(post, posts),
}));

writeFileSync(outputPath, JSON.stringify(catalog, null, 2) + '\n');
console.log(
  `blog index: ${catalog.length} posts (full email HTML) → docs_v2/public/blog-index.json`,
);

// Emits docs_v2/public/blog-index.json — the machine-readable post
// catalog the newsletter Worker reads: drip order, subjects, each
// post's COMPLETE email HTML (rendered by blog-email-renderer.mjs, the
// deterministic post → newsletter conversion), its committed embed
// screenshots (the X composer's attachable images), and a plain-text
// rendition of the body (the thread composer's raw material). The
// Worker substitutes only the per-recipient {{UNSUBSCRIBE_URL}}
// placeholder. Deterministic from committed files, so it runs in every
// build, including shallow-clone deploys, and ships with the site at
// https://ivue.dev/blog-index.json.
//   npm run sync:blog-index   (chained into build:docs)
import { readdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPostsWithSource, renderEmail } from './blog-email-renderer.mjs';

const SITE = 'https://ivue.dev';
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(scriptDirectory, '../public/blog-index.json');
const embedsDirectory = resolve(scriptDirectory, '../public/blog/embeds');

// committed embed screenshots, grouped by slug (<slug>-embed-<n>.png)
const embedsBySlug = new Map();
for (const entry of readdirSync(embedsDirectory).sort()) {
  const match = entry.match(/^(.+)-embed-\d+\.png$/);
  if (!match) continue;
  const urls = embedsBySlug.get(match[1]) ?? [];
  urls.push(`${SITE}/blog/embeds/${entry}`);
  embedsBySlug.set(match[1], urls);
}

// The body as plain text: markdown noise stripped, code fences and
// embeds become short markers, links keep their words. Paragraphs stay
// separated by blank lines — the thread splitter breaks on them.
function plainText(source) {
  return source
    .replace(/^---[\s\S]*?---/, '') // frontmatter
    .replace(/<BlogPostDate \/>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^# .*$/m, '') // the H1 duplicates the title
    .replace(/```[\s\S]*?```/g, '[code — in the article]')
    .replace(/^:::.*$/gm, '')
    .replace(/<ClientOnly>[\s\S]*?<\/ClientOnly>/g, '[live demo — in the article]')
    .replace(/^<[A-Z][^\n]*$/gm, '[live demo — in the article]')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/^\|.*$/gm, '') // tables don't survive plain text
    .replace(/^#{2,6} (.*)$/gm, '$1') // headings become plain lines
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links keep their words
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^> ?/gm, '')
    .replace(/^[-*] /gm, '— ')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const posts = loadPostsWithSource(); // oldest first — the drip order
const catalog = [];
for (const post of posts) {
  catalog.push({
    slug: post.slug,
    title: post.title,
    description: post.description,
    url: post.url,
    date: post.date,
    timestamp: post.timestamp,
    embedImages: embedsBySlug.get(post.slug) ?? [],
    plainText: plainText(post.source),
    emailHtml: await renderEmail(post, posts),
  });
}

writeFileSync(outputPath, JSON.stringify(catalog, null, 2) + '\n');
console.log(
  `blog index: ${catalog.length} posts (email HTML + embeds + plain text) → docs_v2/public/blog-index.json`,
);

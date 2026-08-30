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
import {
  loadPostsWithSource,
  renderEmail,
  renderWelcomeEmail,
  toLightVariant,
} from './blog-email-renderer.mjs';

const SITE = 'https://ivue.dev';
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(scriptDirectory, '../public/blog-index.json');
const embedsDirectory = resolve(scriptDirectory, '../public/blog/embeds');
const codeDirectory = resolve(scriptDirectory, '../public/blog/code');

// committed screenshots, grouped by slug — numeric sort keeps -10
// after -9, matching document order
function shotsBySlug(directory, marker, urlPrefix) {
  const groups = new Map();
  const entries = readdirSync(directory)
    .map((entry) => entry.match(new RegExp(`^(.+)-${marker}-(\\d+)\\.png$`)))
    .filter(Boolean)
    .sort((first, second) =>
      first[1] === second[1]
        ? Number(first[2]) - Number(second[2])
        : first[1].localeCompare(second[1]),
    );
  for (const match of entries) {
    const urls = groups.get(match[1]) ?? [];
    urls.push(`${SITE}/${urlPrefix}/${match[0]}`);
    groups.set(match[1], urls);
  }
  return groups;
}
const embedsBySlug = shotsBySlug(embedsDirectory, 'embed', 'blog/embeds');
const codeBySlug = shotsBySlug(codeDirectory, 'code', 'blog/code');

// The body as plain text: markdown noise stripped, code fences and
// embeds become short markers, links keep their words. Paragraphs stay
// separated by blank lines — the thread splitter breaks on them.
function plainText(source) {
  return source
    .replace(/^---[\s\S]*?---/, '') // frontmatter
    .replace(/<BlogPostDate \/>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^# .*$/m, '') // the H1 duplicates the title
    // EVERY fence becomes a marker — including each tab of a
    // code-group — matching the code shots, which now capture all tabs
    // in document order (one shot per fence, 1:1 with these markers)
    .replace(/^::: ?code-group$/gm, '')
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
  const emailHtml = await renderEmail(post, posts);
  catalog.push({
    slug: post.slug,
    title: post.title,
    description: post.description,
    url: post.url,
    date: post.date,
    timestamp: post.timestamp,
    embedImages: embedsBySlug.get(post.slug) ?? [],
    codeImages: codeBySlug.get(post.slug) ?? [],
    plainText: plainText(post.source),
    emailHtml,
    // the Gmail-UI variant — same content, chrome tokens mapped light
    emailHtmlLight: toLightVariant(emailHtml),
  });
}

writeFileSync(outputPath, JSON.stringify(catalog, null, 2) + '\n');
console.log(
  `blog index: ${catalog.length} posts (email HTML + embeds + plain text) → docs_v2/public/blog-index.json`,
);

// The signup welcome email rides the same build-time pipeline: the
// Worker fetches https://ivue.dev/welcome-email.html on each signup and
// fills the per-recipient {{UNSUBSCRIBE_URL}} placeholder.
const welcomePath = resolve(scriptDirectory, '../public/welcome-email.html');
const welcomeHtml = renderWelcomeEmail(posts);
writeFileSync(welcomePath, welcomeHtml);
writeFileSync(
  resolve(scriptDirectory, '../public/welcome-email-light.html'),
  toLightVariant(welcomeHtml),
);
console.log(
  'welcome email → docs_v2/public/welcome-email.html (+ -light variant)',
);

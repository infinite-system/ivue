// RSS feed for the blog — generated at build time from the same
// committed inputs everything else uses: the post markdown (title,
// description, tags), blog-dates.json (exact publish timestamps), and
// the banner PNGs (media enclosure). Private channel posts are
// excluded through the one gate (isPrivatePost). Output lands in
// docs_v2/public so the site build ships it as /feed.xml.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isPrivatePost } from './channel-posts.mjs';

const SITE = 'https://ivue.dev';
const blogDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../blog',
);

const recordedDates = JSON.parse(
  readFileSync(resolve(blogDirectory, 'blog-dates.json'), 'utf8'),
);

function escapeXml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const posts = readdirSync(blogDirectory)
  .filter((entry) => entry.endsWith('.md') && entry !== 'index.md')
  .map((entry) => {
    const slug = entry.replace(/\.md$/, '');
    const source = readFileSync(resolve(blogDirectory, entry), 'utf8');
    if (isPrivatePost(source)) return null;
    const title = source.match(/^title:\s*['"]?(.+?)['"]?\s*$/m)?.[1] ?? slug;
    const description =
      source.match(/^description:\s*['"]?(.+?)['"]?\s*$/m)?.[1] ?? '';
    const record = recordedDates[slug];
    if (!record?.timestamp) return null;
    return { slug, title, description, timestamp: record.timestamp };
  })
  .filter(Boolean)
  .sort((first, second) => second.timestamp - first.timestamp);

const items = posts
  .map((post) => {
    const url = `${SITE}/blog/${post.slug}`;
    return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(post.timestamp * 1000).toUTCString()}</pubDate>
      <description>${escapeXml(post.description)}</description>
      <enclosure url="${SITE}/blog/${post.slug}.png" type="image/png" length="0" />
    </item>`;
  })
  .join('\n');

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ivue blog</title>
    <link>${SITE}/blog/</link>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml" />
    <description>Class-based reactivity for Vue 3 — plain classes, full reactivity, one kilobyte. Patterns, releases, and measured numbers from the JavaScript frontier.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date(
      (posts[0]?.timestamp ?? 0) * 1000,
    ).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;

const outputPath = resolve(blogDirectory, '../public/feed.xml');
writeFileSync(outputPath, feed);
console.log(`rss: ${posts.length} posts → ${outputPath}`);

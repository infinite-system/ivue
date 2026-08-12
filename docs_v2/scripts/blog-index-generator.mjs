// Emits docs_v2/public/blog-index.json — the machine-readable post catalog
// the newsletter Worker reads to run the oldest-unsent drip (see
// /newsletter). Deterministic from committed files (frontmatter +
// blog-dates.json), so it runs in every build, including shallow-clone
// deploys, and ships with the site at https://ivue.dev/blog-index.json.
//   npm run sync:blog-index   (chained into build:docs)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const blogDirectory = resolve(scriptDirectory, '../blog');
const outputPath = resolve(scriptDirectory, '../public/blog-index.json');

const recordedDates = JSON.parse(
  readFileSync(resolve(blogDirectory, 'blog-dates.json'), 'utf8'),
);

function frontmatterField(source, field) {
  const match = source.match(
    new RegExp(`^${field}:\\s*(?:'([^']*)'|"([^"]*)"|(.+))$`, 'm'),
  );
  if (!match) return '';
  return (match[1] ?? match[2] ?? match[3] ?? '').trim();
}

const posts = readdirSync(blogDirectory)
  .filter((entry) => entry.endsWith('.md') && entry !== 'index.md')
  .map((entry) => {
    const slug = entry.slice(0, -'.md'.length);
    const source = readFileSync(resolve(blogDirectory, entry), 'utf8');
    const record = recordedDates[slug];
    return {
      slug,
      title: frontmatterField(source, 'title'),
      description: frontmatterField(source, 'description'),
      url: `https://ivue.dev/blog/${slug}`,
      date: record?.date ?? null,
      timestamp: record?.timestamp ?? 0,
    };
  })
  // drip order: from the beginning of time
  .sort((first, second) => first.timestamp - second.timestamp);

writeFileSync(outputPath, JSON.stringify(posts, null, 2) + '\n');
console.log(`blog index: ${posts.length} posts → docs_v2/public/blog-index.json`);

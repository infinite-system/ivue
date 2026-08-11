// Blog index data: one JSON-shaped record per post, built by VitePress's
// content loader at dev and build time. Frontmatter supplies title and
// excerpt; blog-dates.json (committed — see scripts/blog-dates-generator.mjs)
// supplies the git-recovered publication date, because deploy builds run on
// shallow clones with no usable history.
import { createContentLoader } from 'vitepress';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const blogDirectory = dirname(fileURLToPath(import.meta.url));
const recordedDates = JSON.parse(
  readFileSync(resolve(blogDirectory, 'blog-dates.json'), 'utf8'),
);

export default createContentLoader('blog/*.md', {
  transform(pages) {
    return pages
      .filter((page) => !/\/blog\/(index)?(\.html)?$/.test(page.url))
      .map((page) => {
        const slug = page.url
          .split('/')
          .filter(Boolean)
          .pop()
          .replace(/\.html$/, '');
        const recorded = recordedDates[slug];
        return {
          url: page.url,
          slug,
          title: page.frontmatter.title,
          excerpt: page.frontmatter.description,
          image: `/blog/${slug}.png`,
          // A post newer than the committed dates file falls back to its
          // frontmatter month until sync:blog-dates runs.
          date: recorded?.date ?? `${page.frontmatter.date}-01`,
          timestamp: recorded?.timestamp ?? Number.MAX_SAFE_INTEGER,
        };
      })
      .sort((first, second) => second.timestamp - first.timestamp);
  },
});

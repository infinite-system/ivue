// Blog index data: one JSON-shaped record per post, built by VitePress's
// content loader at dev and build time. Frontmatter supplies title and
// excerpt; blog-dates.json (committed — see scripts/blog-dates-generator.mjs)
// supplies the git-recovered publication date, because deploy builds run on
// shallow clones with no usable history.
import { createContentLoader } from 'vitepress';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const publicBlogDirectory = fileURLToPath(
  new URL('../public/blog', import.meta.url),
);
// A real module import (not readFileSync): the bundler tracks it as a
// dependency, so a date re-sync invalidates a running dev server instead
// of silently serving the frontmatter fallback until restart.
import recordedDates from './blog-dates.json';

// Full-content search: the raw markdown collapses to lowercase plain
// text (frontmatter and images out, code kept — API names are search
// terms). ~5 KB per post riding the blog index chunk only.
function toSearchText(src) {
  return (src ?? '')
    .replace(/^---[\s\S]*?---/, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|-]/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

export default createContentLoader('blog/*.md', {
  includeSrc: true,
  transform(pages) {
    return pages
      .filter((page) => !/\/blog\/(index)?(\.html)?$/.test(page.url))
      // channel posts (private distribution artifacts) ride the dev
      // timeline only — production data never contains them
      .filter(
        (page) =>
          process.env.NODE_ENV !== 'production' || !page.frontmatter.channel,
      )
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
          tags: page.frontmatter.tags ?? [],
          channel: page.frontmatter.channel ?? null,
          searchText: toSearchText(page.src),
          // a post without a rendered banner (possible for channel
          // posts) falls back to the index's placeholder thumb
          image: existsSync(`${publicBlogDirectory}/${slug}.png`)
            ? `/blog/${slug}.png`
            : null,
          // A post newer than the committed dates file falls back to its
          // frontmatter month until sync:blog-dates runs.
          date: recorded?.date ?? `${page.frontmatter.date}-01`,
          timestamp: recorded?.timestamp ?? Number.MAX_SAFE_INTEGER,
        };
      })
      .sort((first, second) => second.timestamp - first.timestamp);
  },
});

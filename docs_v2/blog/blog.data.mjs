// Blog index data: one JSON-shaped record per post, built by VitePress's
// content loader at dev and build time. Frontmatter supplies title and
// excerpt; blog-dates.json (committed — see scripts/blog-dates-generator.mjs)
// supplies the git-recovered publication date, because deploy builds run on
// shallow clones with no usable history.
import { createContentLoader } from 'vitepress';
// A real module import (not readFileSync): the bundler tracks it as a
// dependency, so a date re-sync invalidates a running dev server instead
// of silently serving the frontmatter fallback until restart.
import recordedDates from './blog-dates.json';

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
          tags: page.frontmatter.tags ?? [],
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

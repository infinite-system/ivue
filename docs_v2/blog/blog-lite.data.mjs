// Slim blog metadata for the related-posts aside block: slug, title,
// date, banner — and nothing heavy (no searchText, no excerpts). The
// full loader (blog.data.mjs) ships ~5 KB per post of search text and
// belongs to the blog index only; this one rides the theme bundle at
// a few kilobytes total.
import { createContentLoader } from 'vitepress';
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
          slug,
          url: page.url,
          title: page.frontmatter.title,
          image: `/blog/${slug}.png`,
          date: recorded?.date ?? `${page.frontmatter.date}-01`,
        };
      });
  },
});

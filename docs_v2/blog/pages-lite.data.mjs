// Slim metadata for NON-BLOG pages — title + description keyed by
// route — feeding the link-preview hover cards. A few KB total; the
// preview images themselves are the committed /og/ banners.
import { createContentLoader } from 'vitepress';

export default createContentLoader(['*.md', '{guide,examples,api,releases}/**/*.md'], {
  transform(pages) {
    const records = {};
    for (const page of pages) {
      if (page.url.startsWith('/blog/')) continue;
      const path = page.url.replace(/\.html$/, '');
      records[path] = {
        title: page.frontmatter.title ?? '',
        description: page.frontmatter.description ?? '',
      };
    }
    return records;
  },
});

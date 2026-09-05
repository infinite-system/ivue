// BlogPostDate.ts — the tag row at the top of a post. The date moved to
// the doc footer (BlogPublishedDate) — the content is invariant-timeless,
// so the top of the post leads with tags only.
import { useRoute, withBase } from 'vitepress';
import { Reactive } from '../../../../lib/Reactive';
import { data as posts } from '../../../blog/blog.data.mjs';

class $BlogPostDate {
  constructor() {
    this.route = useRoute();
  }

  protected readonly route: ReturnType<typeof useRoute>;

  // DERIVED — plain getters
  get post(): BlogPostDate.Post | undefined {
    const currentUrl = this.route.path.replace(/\.html$/, '');
    return (posts as BlogPostDate.Post[]).find((entry) => entry.url === currentUrl);
  }
  get tags() {
    return this.post?.tags ?? [];
  }
  get hasTags() {
    return this.tags.length > 0;
  }
  get formattedDate() {
    if (!this.post) return '';
    return new Date(this.post.date + 'T00:00:00Z').toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
  }

  // METHODS
  /** In-index tag filter link — the index arrives pre-filtered. */
  tagHref(tag: string) {
    return withBase(`/blog/?tag=${tag}`);
  }
}

export namespace BlogPostDate {
  export const $Class = $BlogPostDate; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  export interface Post {
    url: string;
    date: string;
    tags: string[];
  }
}

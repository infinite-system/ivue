// BlogSidebarSearch.ts — the blog rail's head: the All-articles link plus
// a search box that searches the whole archive — titles, tags, excerpts
// AND body text — ranked exactly like the index page's search
// (blog-search.ts). While a query is typed the month groups step aside
// and the ranked results take their place; clearing brings the months
// back. The main content is never touched.
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, withBase } from 'vitepress';
import { Reactive } from '../../../../lib/Reactive';
import { Static } from '../../../../lib/Static';
import { data as allPosts } from '../../../blog/blog.data.mjs';
import { rankPosts } from '../blog-search';

class $BlogSidebarSearch {
  /** The class on the rail that hides VitePress's month groups. */
  static get HIDDEN_CLASS() {
    return 'blog-rail-searching';
  }

  /** The searchable archive — public posts only, built once per receiver. */
  static get $publicPosts(): BlogSidebarSearch.Post[] {
    return (allPosts as BlogSidebarSearch.Post[]).filter((post) => !post.private);
  }

  constructor() {
    this.route = useRoute();
    // the month groups are VitePress DOM — hidden by a class on the rail
    // while searching, re-asserted after each navigation (the rail re-renders)
    watch([() => this.searching, () => this.route.path], () => this.scheduleSync());
    onBeforeUnmount(() => this.dispose());
  }

  protected readonly route: ReturnType<typeof useRoute>;

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $BlogSidebarSearch;
  }

  // MUTABLE STATE
  get query() {
    return ref('');
  }

  // DERIVED — plain getters
  get isBlogSection() {
    return this.route.path.startsWith('/blog');
  }
  get isBlogIndex() {
    return /^\/blog\/?(index\.html)?$/.test(this.route.path);
  }
  get searching() {
    return this.query.value.trim().length > 0;
  }
  get results() {
    return this.searching ? rankPosts(this.self.$publicPosts, this.query.value) : [];
  }
  get matchCountLabel() {
    const count = this.results.length;
    return `${count} match${count === 1 ? '' : 'es'}`;
  }
  get allArticlesHref() {
    return withBase('/blog/');
  }

  // METHODS
  /** Whether a result is the article being read (a per-item template condition). */
  isCurrent(post: BlogSidebarSearch.Post) {
    return this.route.path.replace(/\.html$/, '') === post.url.replace(/\.html$/, '');
  }

  postHref(post: BlogSidebarSearch.Post) {
    return withBase(post.url);
  }

  shortDate(date: string) {
    return new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  }

  syncGroups() {
    document
      .querySelector('.VPSidebar')
      ?.classList.toggle(this.self.HIDDEN_CLASS, this.searching && this.isBlogSection);
  }

  scheduleSync() {
    nextTick(() => this.syncGroups());
  }

  clear() {
    this.query.value = '';
  }

  dispose() {
    this.query.value = '';
    this.syncGroups();
  }
}

export namespace BlogSidebarSearch {
  export const $Class = Static($BlogSidebarSearch); // anchor — it declares statics; children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  /** A blog index entry as the loader ships it (blog.data.mjs). */
  export interface Post {
    slug: string;
    url: string;
    title: string;
    excerpt: string;
    searchText: string;
    date: string;
    timestamp: number;
    tags: string[];
    private?: boolean;
  }
}

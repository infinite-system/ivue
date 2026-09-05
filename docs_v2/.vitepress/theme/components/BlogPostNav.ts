// BlogPostNav.ts — the older/newer post cards under an article. Private
// posts (dev-only artifacts) never appear in prev/next — the walk sees
// exactly what production publishes.
import { useRoute, withBase } from 'vitepress';
import { Reactive } from '../../../../lib/Reactive';
import { Static } from '../../../../lib/Static';
import { data as allPosts } from '../../../blog/blog.data.mjs';

class $BlogPostNav {
  /** The public archive, newest-first, built once per receiver. */
  static get $posts(): BlogPostNav.Post[] {
    return (allPosts as BlogPostNav.Post[]).filter((post) => !post.private);
  }

  constructor() {
    this.route = useRoute();
  }

  protected readonly route: ReturnType<typeof useRoute>;

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $BlogPostNav;
  }

  // DERIVED — plain getters
  get isBlogPost() {
    return /^\/blog\/.+/.test(this.route.path) && !this.route.path.endsWith('/blog/');
  }
  /** Posts are sorted newest-first; "older" walks forward in the array. */
  get currentIndex() {
    const currentUrl = this.route.path.replace(/\.html$/, '');
    return this.self.$posts.findIndex((post) => post.url === currentUrl);
  }
  get newerPost(): BlogPostNav.Post | null {
    const index = this.currentIndex;
    return index > 0 ? this.self.$posts[index - 1] : null;
  }
  get olderPost(): BlogPostNav.Post | null {
    const index = this.currentIndex;
    const posts = this.self.$posts;
    return index >= 0 && index < posts.length - 1 ? posts[index + 1] : null;
  }
  get hasNav() {
    return this.isBlogPost && !!(this.olderPost || this.newerPost);
  }

  // METHODS
  postHref(post: BlogPostNav.Post) {
    return withBase(post.url);
  }

  imageSrc(post: BlogPostNav.Post) {
    return withBase(post.image);
  }
}

export namespace BlogPostNav {
  export const $Class = Static($BlogPostNav); // anchor — it declares statics; children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  /** A blog index entry as the loader ships it (blog.data.mjs). */
  export interface Post {
    slug: string;
    url: string;
    title: string;
    excerpt: string;
    image: string;
    private?: boolean;
  }
}

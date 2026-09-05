// BlogBackLink.ts — the "Back to …" link above a post.
//
// WHERE back leads is remembered in the HISTORY ENTRY ITSELF
// (history.state.backPath, stamped when the entry is pushed): the entry
// directly below any pushed entry is, by construction, the page it was
// pushed from — and unlike any component- or path-keyed memory, the stamp
// is per ENTRY, so it stays truthful when the same post appears twice in
// the stack (related links cycle) and survives any number of back/forward
// pops. Direct entries (a mail link, a shared URL) have no stamp and fall
// back to a plain /blog/ link.
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter, withBase } from 'vitepress';
import { Reactive } from '../../../../lib/Reactive';
import { Static } from '../../../../lib/Static';
import { data as blogPosts } from '../../../blog/blog-lite.data.mjs';
import { data as pageRecords } from '../../../blog/pages-lite.data.mjs';

class $BlogBackLink {
  /** Blog posts by slug, built once per receiver. */
  static get $blogBySlug(): Map<string, BlogBackLink.Post> {
    return new Map((blogPosts as BlogBackLink.Post[]).map((post) => [post.slug, post]));
  }

  /** VitePress overwrites entry state with non-spreading replaceState
   *  calls ({ scrollPosition } on departure, {} on clean-URL
   *  normalization), which would destroy the stamp — so replaceState is
   *  wrapped ONCE to carry an existing backPath over unless the caller
   *  sets its own. A replace never changes which entry sits below, so
   *  carrying the stamp is always correct. */
  static installStampCarrier() {
    if (typeof window === 'undefined') return;
    const current = history.replaceState as BlogBackLink.StampingReplaceState;
    if (current.__ivueBackStamp) return;
    const original = history.replaceState.bind(history);
    const wrapped: BlogBackLink.StampingReplaceState = function (state, title, url) {
      const backPath = history.state?.backPath;
      if (backPath && state && typeof state === 'object' && !('backPath' in state)) {
        state = { ...state, backPath };
      }
      original(state, title, url);
    };
    wrapped.__ivueBackStamp = true;
    history.replaceState = wrapped;
  }

  constructor() {
    this.self.installStampCarrier();
    this.route = useRoute();
    this.router = useRouter();
    onMounted(() => this.onMount());
    onUnmounted(() => this.onUnmount());
    watch(
      () => this.route.path,
      (path) => this.onRouteChange(path),
    );
  }

  protected readonly route: ReturnType<typeof useRoute>;
  protected readonly router: ReturnType<typeof useRouter>;

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $BlogBackLink;
  }

  // MUTABLE STATE
  /** The stamp read off the current history entry — null on direct entry. */
  get previousPath() {
    return ref<string | null>(null);
  }
  /** The path the reader is on, remembered so a navigation can stamp it
   *  onto the entry being pushed. */
  get currentPath() {
    return ref('');
  }
  /** A popstate is in flight — the next route change is a pop, not a push. */
  get poppingHistory() {
    return ref(false);
  }

  // DERIVED
  get isBlogPost() {
    return /^\/blog\/.+/.test(this.route.path) && !this.route.path.endsWith('/blog/');
  }
  get backLabel() {
    const previous = this.previousPath.value;
    if (!previous || this.isBlogIndex(previous)) return 'Back to Blog';
    const title = this.titleFor(previous);
    return title ? `Back to ${title}` : 'Back';
  }
  /** With a previous page the href names IT (honest modifier-clicks /
   *  copy-link); on direct entry it is the blog index. */
  get backHref() {
    return withBase(this.previousPath.value ?? '/blog/');
  }

  // METHODS
  isBlogIndex(path: string) {
    return /^\/blog\/?(index\.html)?$/.test(path);
  }

  /** Title of an internal path — a blog post's own title, a docs page's
   *  frontmatter title, or null when unknown. Same mapping the link
   *  previews use. */
  titleFor(path: string): string | null {
    const clean = path.replace(/\.html$/, '');
    const blogPost = clean.match(/^\/blog\/([^/]+)$/);
    if (blogPost) return this.self.$blogBySlug.get(blogPost[1])?.title ?? null;
    const record = (pageRecords as Record<string, BlogBackLink.PageRecord | undefined>)[
      clean.endsWith('/') ? clean.slice(0, -1) || clean : clean
    ];
    return record?.title ?? null;
  }

  readStamp() {
    this.previousPath.value = (window.history.state?.backPath as string | undefined) ?? null;
  }

  markPopping() {
    this.poppingHistory.value = true;
  }

  onMount() {
    this.currentPath.value = this.route.path;
    window.addEventListener('popstate', this.markPopping);
    this.readStamp();
  }

  onUnmount() {
    window.removeEventListener('popstate', this.markPopping);
  }

  onRouteChange(path: string) {
    const cameFrom = this.currentPath.value;
    const popped = this.poppingHistory.value;
    this.poppingHistory.value = false;
    this.currentPath.value = path;
    if (!popped && !window.history.state?.backPath) {
      window.history.replaceState({ ...window.history.state, backPath: cameFrom }, '');
    }
    this.readStamp();
  }

  goBack(event: MouseEvent) {
    // modifier clicks (new tab) keep the plain link behavior
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (this.previousPath.value) {
      window.history.go(-1);
    } else {
      this.router.go(withBase('/blog/'));
    }
  }
}

export namespace BlogBackLink {
  export const $Class = Static($BlogBackLink); // anchor — it declares statics; children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  export interface Post {
    slug: string;
    title: string;
  }

  export interface PageRecord {
    title?: string;
  }

  export interface StampingReplaceState {
    (state: any, title: string, url?: string | URL | null): void;
    __ivueBackStamp?: boolean;
  }
}

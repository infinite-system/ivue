// BlogArchiveScroller.ts — the blog archive footer's model, scrolled by
// the production VirtualScroller from the examples — the same class the
// docs demonstrate, dogfooding as a footer. Auto-plays only while
// visible; the right-hand scrollbar is draggable and reflects the
// VIRTUAL position (native scrollTop stays 0 by design).
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue';
import { useRoute, withBase } from 'vitepress';
import { Reactive } from '../../../../lib/Reactive';
import { Static } from '../../../../lib/Static';
import type { VirtualScroller } from '../../../../examples/playground/src/examples/virtual-scroller/VirtualScroller';
import { data as allPosts } from '../../../blog/blog.data.mjs';

class $BlogArchiveScroller {
  static get AUTO_PLAY_INTERVAL_MS() {
    return 700;
  }

  static get VISIBILITY_THRESHOLD() {
    return 0.35;
  }

  /** The archive — private posts (dev-only artifacts) stay out; built once per receiver. */
  static get $posts(): BlogArchiveScroller.Post[] {
    return (allPosts as BlogArchiveScroller.Post[]).filter((post) => !post.private);
  }

  constructor() {
    this.route = useRoute();
    // ClientOnly mounts its children AFTER this component's onMounted, so
    // the viewport ref fills late — watch it instead of assuming mount order.
    watch(
      () => this.viewport.value,
      (element) => this.observeViewport(element),
    );
    onBeforeUnmount(() => this.dispose());
  }

  protected readonly route: ReturnType<typeof useRoute>;

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $BlogArchiveScroller;
  }

  // TEMPLATE-REF TARGETS
  get scroller() {
    return shallowRef<VirtualScroller.Exposed<BlogArchiveScroller.ArchiveItem> | null>(null);
  }
  get viewport() {
    return ref<HTMLElement | null>(null);
  }

  // STATE — the visibility observer, held for disposal
  get observer() {
    return shallowRef<IntersectionObserver | null>(null);
  }

  // DERIVED
  get isBlogPost() {
    return /^\/blog\/.+/.test(this.route.path) && !this.route.path.endsWith('/blog/');
  }
  /** Posts arrive newest-first from the loader; the current article stays
   *  in the list, marked as the one being read. */
  // computed: stable-handle — the list is a prop of the scroller and must keep its identity between reads
  get archiveItems() {
    return computed(() => this.buildArchiveItems());
  }

  // METHODS
  buildArchiveItems(): BlogArchiveScroller.ArchiveItem[] {
    const currentUrl = this.route.path.replace(/\.html$/, '');
    return this.self.$posts.map((post) => ({
      id: post.slug,
      body: '',
      position: '',
      url: post.url,
      title: post.title,
      excerpt: post.excerpt,
      date: post.date,
      current: post.url === currentUrl,
    }));
  }

  rowHref(item: BlogArchiveScroller.ArchiveItem) {
    return withBase(item.url);
  }

  rowAriaCurrent(item: BlogArchiveScroller.ArchiveItem) {
    return item.current ? 'page' : undefined;
  }

  formatDate(date: string) {
    return new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  }

  observeViewport(element: HTMLElement | null) {
    if (!element || this.observer.value) return;
    const observer = new IntersectionObserver(
      ([entry]) => this.onVisibility(entry),
      { threshold: this.self.VISIBILITY_THRESHOLD },
    );
    observer.observe(element);
    this.observer.value = observer;
  }

  onVisibility(entry: IntersectionObserverEntry) {
    const scroller = this.scroller.value;
    if (!scroller) return;
    if (entry.isIntersecting) scroller.startAutoPlay(this.self.AUTO_PLAY_INTERVAL_MS);
    else scroller.stopAutoPlay();
  }

  dispose() {
    this.observer.value?.disconnect();
  }
}

export namespace BlogArchiveScroller {
  export const $Class = Static($BlogArchiveScroller); // anchor — it declares statics; children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  /** A blog index entry as the loader ships it (blog.data.mjs). */
  export interface Post {
    slug: string;
    url: string;
    title: string;
    excerpt: string;
    date: string;
    private?: boolean;
  }

  export interface ArchiveItem extends VirtualScroller.BaseItem {
    url: string;
    title: string;
    excerpt: string;
    date: string;
    current: boolean;
  }
}

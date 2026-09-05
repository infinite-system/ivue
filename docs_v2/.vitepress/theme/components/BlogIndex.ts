// BlogIndex.ts — the blog index page's model: the visible set (public
// posts, or everything on the dev server behind "See all"), the ranked
// search, the tag cloud filter, per-row tag folding, pagination, and the
// two per-browser preferences (view style, see-all).
import { computed, onMounted, ref, watch } from 'vue';
import { withBase } from 'vitepress';
import { Reactive } from '../../../../lib/Reactive';
import { Static } from '../../../../lib/Static';
import { data as allPosts } from '../../../blog/blog.data.mjs';
import { rankPosts } from '../blog-search';

class $BlogIndex {
  static get VIEW_STORAGE_KEY() {
    return 'ivue-blog-view';
  }

  static get SEE_ALL_STORAGE_KEY() {
    return 'ivue-blog-see-all';
  }

  static get CHANNEL_LABELS(): Record<string, string> {
    return {
      hn: 'HN',
      reddit: 'REDDIT',
      x: '𝕏 THREAD',
      linkedin: 'LINKEDIN',
      note: 'NOTE',
    };
  }

  /** A CHARACTER budget decides how many tag chips a row shows (no layout
   *  measurement — deterministic and SSR-stable); list rows run the
   *  content width, cards share a grid cell. */
  static get TAG_CHAR_BUDGET(): Record<BlogIndex.ViewStyle, number> {
    return { list: 34, cards: 20 };
  }

  static get PAGE_SIZE() {
    return 100;
  }

  static get FRESH_WINDOW_SECONDS() {
    return 14 * 86_400;
  }

  constructor() {
    // a narrower filter can strand the page index — any filter change
    // starts from page 1 and collapses an expanded tag row
    watch(
      [() => this.activeTag.value, () => this.searchQuery.value],
      () => this.resetPage(),
    );
    onMounted(() => this.onMount());
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $BlogIndex;
  }

  // MUTABLE STATE — preferences and filters
  /** List is the default; the visitor's last choice persists per browser. */
  get viewStyle() {
    return ref<BlogIndex.ViewStyle>('list');
  }
  /** Channel posts (private HN/X/… artifacts) exist only in dev-server
   *  data — production data never contains them, so the See-all toggle
   *  simply never renders there. Default view = exactly what production
   *  shows. */
  get seeAll() {
    return ref(false);
  }
  get searchQuery() {
    return ref('');
  }
  get activeTag() {
    return ref<string | null>(null);
  }
  /** The one row whose folded tags are expanded (list view inline, cards
   *  view as an anchored overlay). */
  get expandedTagsSlug() {
    return ref<string | null>(null);
  }
  get page() {
    return ref(1);
  }
  /** Freshness is judged client-side after mount — no hydration mismatch. */
  get nowSeconds() {
    return ref(0);
  }

  // DERIVED — plain getters
  get posts(): BlogIndex.Post[] {
    return allPosts;
  }
  get privatePostCount() {
    return this.posts.filter((post) => post.private).length;
  }
  get hasPrivatePosts() {
    return this.privatePostCount > 0;
  }
  get visiblePosts() {
    return this.seeAll.value ? this.posts : this.posts.filter((post) => !post.private);
  }
  get articleCountLabel() {
    return `${this.visiblePosts.length} articles`;
  }
  get seeAllLabel() {
    return this.seeAll.value ? 'Public view' : `See all +${this.privatePostCount}`;
  }
  /** Tags come from post frontmatter; the cloud shows each with its count. */
  get tagCounts(): [string, number][] {
    const counts = new Map<string, number>();
    for (const post of this.visiblePosts) {
      for (const tag of post.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort(
      (first, second) => second[1] - first[1] || first[0].localeCompare(second[0]),
    );
  }
  /** Search RANKS, not just filters (blog-search.ts — shared with the
   *  sidebar rail's search). Without a query, newest-first stands. */
  // computed: expensive — the ranking scores every post's body text and the template reads the result several times per render
  get filteredPosts() {
    return computed(() => this.rankFilteredPosts());
  }
  get hasFilter() {
    return !!this.searchQuery.value || !!this.activeTag.value;
  }
  get matchCountLabel() {
    const count = this.filteredPosts.value.length;
    return `${count} match${count === 1 ? '' : 'es'}`;
  }
  get isListView() {
    return this.viewStyle.value === 'list';
  }
  get isCardsView() {
    return this.viewStyle.value === 'cards';
  }
  get pageCount() {
    return Math.max(1, Math.ceil(this.filteredPosts.value.length / this.self.PAGE_SIZE));
  }
  get hasPages() {
    return this.pageCount > 1;
  }
  get pagedPosts() {
    const size = this.self.PAGE_SIZE;
    return this.filteredPosts.value.slice((this.page.value - 1) * size, this.page.value * size);
  }
  get isFirstPage() {
    return this.page.value === 1;
  }
  get isLastPage() {
    return this.page.value === this.pageCount;
  }

  // METHODS — actions and per-item derivations
  rankFilteredPosts() {
    const tag = this.activeTag.value;
    return rankPosts(
      this.visiblePosts.filter((post) => !tag || post.tags.includes(tag)),
      this.searchQuery.value,
    );
  }

  toggleSeeAll() {
    this.seeAll.value = !this.seeAll.value;
    localStorage.setItem(this.self.SEE_ALL_STORAGE_KEY, this.seeAll.value ? '1' : '');
  }

  clearSearch() {
    this.searchQuery.value = '';
  }

  toggleTag(tag: string) {
    this.activeTag.value = this.activeTag.value === tag ? null : tag;
  }

  clearTag() {
    this.activeTag.value = null;
  }

  /** Whether a tag chip is the active filter (a per-item template condition). */
  isActiveTag(tag: string) {
    return this.activeTag.value === tag;
  }

  showList() {
    this.setViewStyle('list');
  }

  showCards() {
    this.setViewStyle('cards');
  }

  setViewStyle(style: BlogIndex.ViewStyle) {
    this.viewStyle.value = style;
    localStorage.setItem(this.self.VIEW_STORAGE_KEY, style);
  }

  postHref(post: BlogIndex.Post) {
    return withBase(post.url);
  }

  imageSrc(post: BlogIndex.Post) {
    return withBase(post.image);
  }

  /** The placeholder thumb's text for a post without a banner. */
  thumbLabel(post: BlogIndex.Post) {
    if (post.channel) return this.self.CHANNEL_LABELS[post.channel];
    return post.private ? 'PRIVATE' : '';
  }

  /** The channel chip beside the date of a private post. */
  chipLabel(post: BlogIndex.Post) {
    return post.channel ? this.self.CHANNEL_LABELS[post.channel] : 'PRIVATE';
  }

  isNew(post: BlogIndex.Post) {
    return (
      this.nowSeconds.value > 0 &&
      this.nowSeconds.value - post.timestamp < this.self.FRESH_WINDOW_SECONDS
    );
  }

  formatDate(date: string) {
    return new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  }

  /** The tags that fit a row's character budget; the whole list once the
   *  row is expanded. */
  visibleTags(post: BlogIndex.Post): string[] {
    if (this.isExpanded(post)) return post.tags;
    return this.fitTags(post, this.self.TAG_CHAR_BUDGET[this.viewStyle.value]);
  }

  hiddenTagCount(post: BlogIndex.Post) {
    return post.tags.length - this.visibleTags(post).length;
  }

  hasHiddenTags(post: BlogIndex.Post) {
    return this.hiddenTagCount(post) > 0;
  }

  hiddenTagsLabel(post: BlogIndex.Post) {
    return `Show ${this.hiddenTagCount(post)} more tags`;
  }

  /** Cards view expands into an ANCHORED OVERLAY (a floating chip panel
   *  on the +N pill) instead of inline — an inline reveal grows the card
   *  and shoves its grid neighbors. These fold WITHOUT the expansion
   *  override: the visible row never changes, only the panel appears. */
  foldedTags(post: BlogIndex.Post): string[] {
    return this.fitTags(post, this.self.TAG_CHAR_BUDGET.cards);
  }

  overlayTags(post: BlogIndex.Post): string[] {
    return post.tags.slice(this.foldedTags(post).length);
  }

  hasOverlayTags(post: BlogIndex.Post) {
    return this.overlayTags(post).length > 0;
  }

  overlayTagsLabel(post: BlogIndex.Post) {
    return `Show ${this.overlayTags(post).length} more tags`;
  }

  isExpanded(post: BlogIndex.Post) {
    return this.expandedTagsSlug.value === post.slug;
  }

  showsOverlay(post: BlogIndex.Post) {
    return this.isExpanded(post) && this.hasOverlayTags(post);
  }

  toggleTagExpand(post: BlogIndex.Post) {
    this.expandedTagsSlug.value = this.isExpanded(post) ? null : post.slug;
  }

  fitTags(post: BlogIndex.Post, budget: number): string[] {
    const shown: string[] = [];
    let spent = 0;
    for (const tag of post.tags) {
      spent += tag.length + 2;
      if (shown.length > 0 && spent > budget) break;
      shown.push(tag);
    }
    return shown;
  }

  goToPage(target: number) {
    this.page.value = Math.min(Math.max(1, target), this.pageCount);
    document
      .querySelector('.blog-index-toolbar')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  newerPage() {
    this.goToPage(this.page.value - 1);
  }

  olderPage() {
    this.goToPage(this.page.value + 1);
  }

  isCurrentPage(pageNumber: number) {
    return pageNumber === this.page.value;
  }

  pageAriaCurrent(pageNumber: number) {
    return this.isCurrentPage(pageNumber) ? 'page' : undefined;
  }

  resetPage() {
    this.page.value = 1;
    this.expandedTagsSlug.value = null;
  }

  onMount() {
    // clicking anywhere outside a tag group closes an open overlay
    document.addEventListener('click', this.onDocumentClick);
    const storedView = localStorage.getItem(this.self.VIEW_STORAGE_KEY);
    if (storedView === 'cards' || storedView === 'list') {
      this.viewStyle.value = storedView;
    }
    if (this.hasPrivatePosts) {
      this.seeAll.value = localStorage.getItem(this.self.SEE_ALL_STORAGE_KEY) === '1';
    }
    this.nowSeconds.value = Math.floor(Date.now() / 1000);
    // in-article tag chips link here as /blog/?tag=x — arrive pre-filtered
    const params = new URLSearchParams(window.location.search);
    const requestedTag = params.get('tag');
    if (requestedTag && this.posts.some((post) => post.tags.includes(requestedTag))) {
      this.activeTag.value = requestedTag;
    }
    // /blog/?q=words — a shareable pre-filled search
    const requestedQuery = params.get('q');
    if (requestedQuery) this.searchQuery.value = requestedQuery;
  }

  onDocumentClick(event: MouseEvent) {
    if (
      this.expandedTagsSlug.value &&
      !(event.target as Element | null)?.closest?.('.foot-tags')
    )
      this.expandedTagsSlug.value = null;
  }
}

export namespace BlogIndex {
  export const $Class = Static($BlogIndex); // anchor — it declares statics; children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  export type ViewStyle = 'list' | 'cards';

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
    image: string;
    private?: boolean;
    channel?: string;
  }
}

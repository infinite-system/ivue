// DocOutlineDropdown.ts — the "On this page" dropdown a narrow screen shows
// under the nav bar, with the way on to the next page added at its bottom.
//
// It replaces VitePress's VPLocalNavOutlineDropdown through a config alias
// and keeps its behaviour: the headings, "Return to top", closing on a
// click outside, on Escape and on a page change. What it adds is a pager —
// on a guide or example page the previous and next pages of the sidebar
// (the same links the page footer shows), on a blog post the older and
// newer post (the same public walk BlogPostNav takes, so a private post
// never appears).
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { onContentUpdated, useData, withBase } from 'vitepress';
// @ts-ignore — VitePress's theme internals ship as plain JS; its package exports ./dist/*
import { resolveTitle } from 'vitepress/dist/client/theme-default/composables/outline.js';
// @ts-ignore — the same helper the page footer's prev/next links read
import { usePrevNext } from 'vitepress/dist/client/theme-default/composables/prev-next.js';
import { Reactive } from '../../../../lib/Reactive';
import { BlogPostNav } from './BlogPostNav';

class $DocOutlineDropdown {
  constructor(public props: DocOutlineDropdown.Props) {
    this.data = useData();
    this.prevNext = usePrevNext();
    this.blogNav = new BlogPostNav.Class();
    // listen for a click outside only while open
    watch(
      () => this.open.value,
      (open) => this.onOpenChange(open)
    );
    // a page change closes it, the way the original does
    onContentUpdated(() => this.close());
    onMounted(() => this.onMount());
    onBeforeUnmount(() => this.onUnmount());
  }

  protected readonly data: ReturnType<typeof useData>;
  protected readonly prevNext: { value: DocOutlineDropdown.PrevNext };
  protected readonly blogNav: InstanceType<typeof BlogPostNav.Class>;

  // MUTABLE STATE
  get open() {
    return ref(false);
  }

  /** The viewport height at opening, so the list never runs off the screen. */
  get viewportHeight() {
    return ref(0);
  }

  // ELEMENT REFS
  get main() {
    return ref<HTMLElement | null>(null);
  }

  get items() {
    return ref<HTMLElement | null>(null);
  }

  // DERIVED
  get hasHeaders(): boolean {
    return this.props.headers.length > 0;
  }

  get title(): string {
    return resolveTitle(this.data.theme.value);
  }

  get returnToTopLabel(): string {
    return this.data.theme.value.returnToTopLabel || 'Return to top';
  }

  get heightStyle(): Record<string, string> {
    return { '--vp-vh': `${this.viewportHeight.value}px` };
  }

  /** The page before this one: the older post on a blog post, the previous
   *  sidebar page anywhere else. */
  get previous(): DocOutlineDropdown.PagerLink | null {
    if (this.blogNav.isBlogPost) {
      const post = this.blogNav.olderPost;
      return post ? { label: 'Older post', text: post.title, href: withBase(post.url) } : null;
    }
    const link = this.prevNext.value.prev;
    return link?.link
      ? { label: 'Previous page', text: link.text, href: withBase(link.link) }
      : null;
  }

  /** The page after this one: the newer post on a blog post, the next sidebar
   *  page anywhere else. */
  get next(): DocOutlineDropdown.PagerLink | null {
    if (this.blogNav.isBlogPost) {
      const post = this.blogNav.newerPost;
      return post ? { label: 'Newer post', text: post.title, href: withBase(post.url) } : null;
    }
    const link = this.prevNext.value.next;
    return link?.link ? { label: 'Next page', text: link.text, href: withBase(link.link) } : null;
  }

  get hasPager(): boolean {
    return Boolean(this.previous || this.next);
  }

  // METHODS
  onToggleClick() {
    this.open.value = !this.open.value;
    this.viewportHeight.value =
      window.innerHeight + Math.min(window.scrollY - this.props.navHeight, 0);
  }

  /** A heading link jumps the page: no slide-out animation on the way. */
  onItemsClick(event: MouseEvent) {
    if (!(event.target as HTMLElement).classList.contains('outline-link')) return;
    if (this.items.value) this.items.value.style.transition = 'none';
    nextTick(() => this.close());
  }

  onTopClick() {
    this.close();
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }

  close() {
    this.open.value = false;
  }

  onOpenChange(open: boolean) {
    if (open) document.addEventListener('click', this.onDocumentClick);
    else document.removeEventListener('click', this.onDocumentClick);
  }

  onDocumentClick(event: MouseEvent) {
    if (!this.main.value?.contains(event.target as Node)) this.close();
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') this.close();
  }

  onMount() {
    window.addEventListener('keydown', this.onKeydown);
  }

  onUnmount() {
    window.removeEventListener('keydown', this.onKeydown);
    document.removeEventListener('click', this.onDocumentClick);
  }
}

export namespace DocOutlineDropdown {
  export const $Class = $DocOutlineDropdown;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export interface MenuItem {
    title: string;
    link: string;
    children?: MenuItem[];
  }

  export interface Props {
    headers: MenuItem[];
    navHeight: number;
  }

  export interface PrevNext {
    prev?: { text: string; link?: string };
    next?: { text: string; link?: string };
  }

  export interface PagerLink {
    label: string;
    text: string;
    href: string;
  }
}

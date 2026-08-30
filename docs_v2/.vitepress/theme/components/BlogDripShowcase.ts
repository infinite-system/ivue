import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import { Reactive } from '../../../../lib/Reactive';
import type { HorizontalVirtualScroller as HorizontalScrollerNs } from '../../../../examples/playground/src/examples/virtual-scroller/HorizontalVirtualScroller';
import { data as allPosts } from '../../../blog/blog.data.mjs';

// The inbox preview above the newsletter hero, riding the REAL machinery:
// the ivue HorizontalVirtualScroller (the vertical scroller's axis-seam
// subclass) in step mode — every few seconds one more post "arrives", the
// way the drip lands one email at a time; wheel and touch scrub the strip
// with lenis physics and snap to card boundaries on settle.
class $BlogDripShowcase {
  // non-reactive internals — cycle bookkeeping, never read by the template
  private timer: ReturnType<typeof setInterval> | undefined;
  private arrivingTimer: ReturnType<typeof setTimeout> | undefined;
  private observer: IntersectionObserver | undefined;
  private inView = false;
  private hovering = false;
  private current = 0;

  constructor() {
    onMounted(() => this.onMount());
    onBeforeUnmount(() => this.dispose());
  }

  // TEMPLATE-REF TARGETS
  get root() {
    return ref<HTMLElement | null>(null);
  }
  get scroller() {
    return shallowRef<HorizontalScrollerNs.Exposed<BlogDripShowcase.DripItem> | null>(
      null,
    );
  }

  // STATE — the delivery theater the template renders
  get arrivingId() {
    return ref('');
  }
  /** Everything at or left of this index has been delivered — those cards
   *  wear the checkmark; the arriving card gets the full stamp first. */
  get deliveredThrough() {
    return ref(-1);
  }

  // DERIVED
  get items() {
    return BlogDripShowcase.items;
  }
  get hasItems() {
    return this.items.length > 0;
  }

  /** Per-card delivery state — the arriving card plays the stamp, cards
   *  behind the frontier wear the permanent check, cards ahead stay
   *  sealed behind the envelope face. */
  cardClasses(item: BlogDripShowcase.DripItem, index: number) {
    const arriving = item.id === this.arrivingId.value;
    return {
      'drip-card--arriving': arriving,
      'drip-card--delivered':
        index <= this.deliveredThrough.value && !arriving,
      'drip-card--sealed': index > this.deliveredThrough.value && !arriving,
    };
  }

  imageLoading(index: number): 'eager' | 'lazy' {
    return index < 6 ? 'eager' : 'lazy';
  }

  onMouseEnter() {
    this.hovering = true;
  }
  onMouseLeave() {
    this.hovering = false;
  }

  /** The card resting under the strip's center — read from the scroller's
   *  OWN geometry (position + half the container), never estimated from
   *  CSS. With snap-align="center" this is also the card every step
   *  centers, so "the arriving card" is a guarantee, not a guess. */
  centerIndexAtRest(): number {
    const scrollerInstance = this.scroller.value;
    if (!scrollerInstance) return 0;
    const position = parseFloat(String(scrollerInstance.scrollPosition)) || 0;
    return (
      scrollerInstance.getIndexAtPosition(
        position + scrollerInstance.containerOuterSize / 2,
      )?.index ?? 0
    );
  }

  /** One delivery: the stamp plays on card `index`, then settles into its
   *  permanent checkmark by advancing the frontier. */
  deliver(index: number) {
    this.arrivingId.value = this.items[index]?.id ?? '';
    clearTimeout(this.arrivingTimer);
    this.arrivingTimer = setTimeout(() => this.settleDelivery(index), 2600);
  }

  settleDelivery(index: number) {
    this.arrivingId.value = '';
    this.deliveredThrough.value = Math.max(
      this.deliveredThrough.value,
      index,
    );
  }

  /** Load AND wrap start identically: the clamped cards left of center are
   *  HISTORY (checked, no stamp — like older mail already in the inbox);
   *  the centered card is the first to actually arrive. Every later check
   *  is therefore preceded by that card's own stamp. */
  beginCycle() {
    this.current = this.centerIndexAtRest();
    this.deliveredThrough.value = this.current - 1;
    // snap the opening card onto the exact center — the stamp rides it
    this.scroller.value?.scrollToIndex(this.current);
    this.deliver(this.current);
  }

  advance() {
    const scrollerInstance = this.scroller.value;
    if (!scrollerInstance || !this.inView || this.hovering || document.hidden)
      return;
    if (scrollerInstance.lenis?.isScrolling) return; // the reader owns it
    if (this.current >= this.items.length - 1) {
      // the loop wrapped — reset to the start and begin a fresh cycle
      this.deliveredThrough.value = -1;
      scrollerInstance.scrollToIndex(0, () => this.beginCycle(), true, 0);
      return;
    }
    this.current += 1;
    scrollerInstance.scrollToIndex(this.current, () =>
      this.deliver(this.current),
    );
  }

  onMount() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (this.items.length < 2) return;
    this.observer = new IntersectionObserver(
      ([entry]) => this.onVisibility(entry.isIntersecting),
      { threshold: 0.35 },
    );
    if (this.root.value) this.observer.observe(this.root.value);
    // first cycle after the strip has measured its opening cards
    setTimeout(() => this.beginCycle(), 600);
    this.timer = setInterval(
      () => this.advance(),
      BlogDripShowcase.ADVANCE_EVERY_MS,
    );
  }

  onVisibility(isIntersecting: boolean) {
    this.inView = isIntersecting;
  }

  dispose() {
    if (this.timer) clearInterval(this.timer);
    clearTimeout(this.arrivingTimer);
    this.observer?.disconnect();
  }
}

export namespace BlogDripShowcase {
  export const $Class = $BlogDripShowcase; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  // the type of every unwrapping surface (defineExpose, reactive())
  export type Instance = typeof Class.Instance;

  /* Values */

  export const ADVANCE_EVERY_MS = 4500;

  export const items: DripItem[] = allPosts
    .filter((post) => !post.private && post.image)
    .map((post) => ({
      id: post.slug,
      body: post.title,
      position: '',
      title: post.title,
      url: post.url,
      image: post.image,
    }));

  /* Types */

  export interface DripItem {
    id: string;
    body: string;
    position: string;
    title: string;
    url: string;
    image: string;
  }
}

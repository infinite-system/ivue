<script setup lang="ts">
// The inbox preview above the newsletter hero, riding the REAL machinery:
// the ivue HorizontalVirtualScroller (the vertical scroller's axis-seam
// subclass) in step mode — every 3 seconds one more post "arrives", the
// way the drip lands one email at a time; wheel and touch scrub the strip
// with lenis physics and snap to card boundaries on settle.
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { withBase } from 'vitepress';
import HorizontalVirtualScroller from '../../../../examples/playground/src/examples/virtual-scroller/HorizontalVirtualScroller.vue';
import type { HorizontalVirtualScroller as HorizontalScrollerNs } from '../../../../examples/playground/src/examples/virtual-scroller/HorizontalVirtualScroller';
import { data as allPosts } from '../../../blog/blog.data.mjs';

interface DripItem {
  id: string;
  body: string;
  position: string;
  title: string;
  url: string;
  image: string;
}

const items: DripItem[] = allPosts
  .filter((post) => !post.private && post.image)
  .map((post) => ({
    id: post.slug,
    body: post.title,
    position: '',
    title: post.title,
    url: post.url,
    image: post.image,
  }));

const ADVANCE_EVERY_MS = 4500;

const root = ref<HTMLElement | null>(null);
const scroller = ref<HorizontalScrollerNs.Exposed<DripItem> | null>(null);
const arrivingId = ref('');
// everything at or left of this index has been delivered — those cards
// wear the checkmark; the arriving card gets the full stamp first
const deliveredThrough = ref(-1);

let timer: ReturnType<typeof setInterval> | undefined;
let arrivingTimer: ReturnType<typeof setTimeout> | undefined;
let observer: IntersectionObserver | undefined;
let inView = false;
let hovering = false;
let current = 0;

/** The card resting under the strip's center — read from the scroller's
 *  OWN geometry (position + half the container), never estimated from
 *  CSS. With snap-align="center" this is also the card every step
 *  centers, so "the arriving card" is a guarantee, not a guess. */
function centerIndexAtRest(): number {
  const scrollerInstance = scroller.value;
  if (!scrollerInstance) return 0;
  const position =
    parseFloat(String(scrollerInstance.scrollPosition)) || 0;
  return (
    scrollerInstance.getIndexAtPosition(
      position + scrollerInstance.containerOuterSize / 2,
    )?.index ?? 0
  );
}

/** One delivery: the stamp plays on card `index`, then settles into its
 *  permanent checkmark by advancing the frontier. */
function deliver(index: number) {
  arrivingId.value = items[index]?.id ?? '';
  clearTimeout(arrivingTimer);
  arrivingTimer = setTimeout(() => {
    arrivingId.value = '';
    deliveredThrough.value = Math.max(deliveredThrough.value, index);
  }, 2600);
}

/** Load AND wrap start identically: the clamped cards left of center are
 *  HISTORY (checked, no stamp — like older mail already in the inbox);
 *  the centered card is the first to actually arrive. Every later check
 *  is therefore preceded by that card's own stamp. */
function beginCycle() {
  current = centerIndexAtRest();
  deliveredThrough.value = current - 1;
  // snap the opening card onto the exact center — the stamp rides it
  scroller.value?.scrollToIndex(current);
  deliver(current);
}

function advance() {
  const scrollerInstance = scroller.value;
  if (!scrollerInstance || !inView || hovering || document.hidden) return;
  if (scrollerInstance.lenis?.isScrolling) return; // the reader owns it
  if (current >= items.length - 1) {
    // the loop wrapped — reset to the start and begin a fresh cycle
    deliveredThrough.value = -1;
    scrollerInstance.scrollToIndex(0, () => beginCycle(), true, 0);
    return;
  }
  current += 1;
  scrollerInstance.scrollToIndex(current, () => deliver(current));
}

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (items.length < 2) return;
  observer = new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
    },
    { threshold: 0.35 },
  );
  if (root.value) observer.observe(root.value);
  // first cycle after the strip has measured its opening cards
  setTimeout(() => beginCycle(), 600);
  timer = setInterval(advance, ADVANCE_EVERY_MS);
});

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
  clearTimeout(arrivingTimer);
  observer?.disconnect();
});
</script>

<template>
  <div
    v-if="items.length"
    ref="root"
    class="drip-showcase"
    aria-label="Every blog post, delivered one email at a time"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
  >
    <ClientOnly>
      <HorizontalVirtualScroller
        ref="scroller"
        :model-value="items"
        :assumed-size="330"
        :padding-quantity="6"
        snap-to-items
        snap-align="center"
      >
        <template #item="{ item, index }">
          <a
            class="drip-card"
            :class="{
              'drip-card--arriving': item.id === arrivingId,
              'drip-card--delivered': index <= deliveredThrough && item.id !== arrivingId,
              'drip-card--sealed': index > deliveredThrough && item.id !== arrivingId,
            }"
            :href="withBase(item.url)"
            tabindex="-1"
          >
            <span class="drip-card__frame">
              <img
                class="drip-card__image"
                :src="withBase(item.image)"
                :alt="item.title"
                width="1200"
                height="630"
                :loading="index < 6 ? 'eager' : 'lazy'"
                decoding="async"
              />
              <span class="drip-card__envelope" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="6" width="18" height="13" rx="2" />
                  <path d="M3.5 7.5 12 13.5l8.5-6" />
                </svg>
              </span>
              <span class="drip-card__delivered" aria-hidden="true">Delivered ✓</span>
              <span class="drip-card__check" aria-hidden="true">✓</span>
            </span>
            <span class="drip-card__title">{{ item.title }}</span>
          </a>
        </template>
      </HorizontalVirtualScroller>
    </ClientOnly>
  </div>
</template>

<style>
.drip-showcase {
  position: relative;
  width: 100vw;
  margin: 26px calc(50% - 50vw) -8px;
  /* the strip and the newsletter hero are ONE block — the strip now
     closes the section, riding the hero's glow from above */
  padding: 10px 0 26px;
}
.drip-showcase::before {
  content: '';
  position: absolute;
  inset: 0;
  /* INVERTED for the strip's place at the section's close: the glow
     anchors at the BOTTOM and fades upward, so the band reads as the
     luminous base of the hero above it, not the start of a new one */
  background:
    radial-gradient(60rem 16rem at 50% 100%, rgba(99, 102, 241, 0.08), transparent 70%),
    linear-gradient(0deg, rgba(45, 212, 191, 0.05), transparent 85%);
  pointer-events: none;
}
.drip-showcase .virtual-scroller--x {
  /* cards enter and leave through a soft edge, not a hard clip */
  -webkit-mask-image: linear-gradient(90deg, transparent, black 4%, black 96%, transparent);
  mask-image: linear-gradient(90deg, transparent, black 4%, black 96%, transparent);
  /* main-axis padding, same contract as the vertical scroller's
     padding-top/bottom: the first and last card rest fully inside the
     edge fade (computeScrollExtent adds it through axisPaddingProps) */
  padding-left: max(4vw, 34px);
  padding-right: max(4vw, 34px);
}

.drip-card {
  display: block;
  width: clamp(230px, 24vw, 320px);
  /* the horizontal padding IS the gap — split SYMMETRICALLY (9+9 = the
     same 18px between frames) so the frame sits at the item's true
     center: centered snap landings would otherwise lean by half the gap,
     visible on narrow screens. The bottom padding is shadow room: the
     frame's hover glow reaches ~26px below it, and the scroller root is
     overflow: hidden — without this the shadow clips at the strip edge. */
  padding: 8px 9px 30px;
  text-decoration: none !important;
  cursor: pointer;
}

.drip-card__frame {
  position: relative;
  display: block;
  overflow: hidden;
  border-radius: 12px;
  /* no stray vertical gaps between border and banner: the theme's vp-doc
     image margins and inline line-height would read as double borders */
  line-height: 0;
  /* NO border on the wrapper, ever — the hover ring lives on the image
     itself (outline), so there is exactly one edge and one radius */
  transition: transform 0.25s, box-shadow 0.25s;
}
.drip-card:hover .drip-card__frame {
  transform: translateY(-3px);
  box-shadow: 0 18px 44px -18px var(--ivue-link-glow);
}
.drip-card:hover .drip-card__image {
  /* the highlight is ON the image: an inset outline hugs the banner's own
     edge at the banner's own radius — nothing to double */
  outline: 1.5px solid var(--ivue-link-accent);
  outline-offset: -1.5px;
}

.drip-card__image {
  display: block;
  width: 100%;
  height: auto;
  margin: 0 !important; /* vp-doc gives images vertical margins — not here */
  aspect-ratio: 1200 / 630;
  object-fit: cover;
  border-radius: 12px; /* the outline follows this radius on hover */
}

/* the delivery: the arriving card starts as a sealed envelope face that
   lifts open to reveal the banner, then a "Delivered" receipt pops */
.drip-card__envelope {
  position: absolute;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  color: #9db6e6;
  background:
    radial-gradient(18rem 9rem at 50% 120%, rgba(45, 212, 191, 0.22), transparent 70%),
    linear-gradient(160deg, #101a33, #0a1226);
  z-index: 1;
}
.drip-card__envelope svg {
  width: 34%;
  height: 34%;
  filter: drop-shadow(0 0 18px rgba(99, 102, 241, 0.55));
}

.drip-card__delivered {
  position: absolute;
  right: 8px;
  top: 8px;
  z-index: 2;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 650;
  letter-spacing: 0.02em;
  line-height: 1.35; /* the frame's line-height: 0 must not crush the pill */
  color: #06251d;
  background: linear-gradient(90deg, #5eead4, #34d399);
  box-shadow: 0 6px 18px -6px rgba(52, 211, 153, 0.7);
  opacity: 0;
  pointer-events: none;
}

/* the permanent receipt: a quiet check on every already-delivered card */
.drip-card__check {
  position: absolute;
  right: 8px;
  top: 8px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  color: #06251d;
  background: linear-gradient(135deg, #5eead4, #34d399);
  box-shadow: 0 4px 12px -4px rgba(52, 211, 153, 0.55);
  opacity: 0;
  transform: scale(0.6);
  transition: opacity 0.4s ease, transform 0.4s ease;
  pointer-events: none;
}
.drip-card--delivered .drip-card__check {
  opacity: 0.92;
  transform: scale(1);
}

/* SEALED: not yet delivered — the banner hides behind the envelope face
   until this card's own arrival lifts it open */
.drip-card--sealed .drip-card__envelope {
  display: flex;
}

.drip-card--arriving .drip-card__envelope {
  display: flex;
  animation: drip-open 0.85s cubic-bezier(0.55, 0, 0.3, 1) 0.25s both;
}
.drip-card--arriving .drip-card__delivered {
  animation: drip-receipt 1.7s ease 0.95s both;
}

@keyframes drip-open {
  0% {
    transform: translateY(0);
    opacity: 1;
  }
  70% {
    opacity: 1;
  }
  100% {
    transform: translateY(-101%);
    opacity: 0.9;
  }
}

@keyframes drip-receipt {
  0% {
    opacity: 0;
    transform: translateY(6px) scale(0.9);
  }
  15%,
  80% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
  }
}

.drip-card__title {
  display: block;
  margin-top: 9px;
  padding: 0 9px; /* centered over the symmetric gap */
  font-size: 13px;
  line-height: 1.4;
  text-align: center;
  color: var(--vp-c-text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.25s;
}
.drip-card:hover .drip-card__title {
  color: var(--vp-c-text-1);
}

@media (prefers-reduced-motion: reduce) {
  /* the delivery theater is off entirely — no cycle runs, so sealed
     cards would never open; show every banner instead */
  .drip-card--sealed .drip-card__envelope,
  .drip-card--arriving .drip-card__envelope,
  .drip-card--arriving .drip-card__delivered {
    animation: none;
    display: none;
  }
  .drip-card__check {
    transition: none;
  }
  .drip-card:hover .drip-card__frame {
    transform: none;
  }
}
</style>

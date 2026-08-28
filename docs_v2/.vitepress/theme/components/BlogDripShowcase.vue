<script setup lang="ts">
// The inbox preview above the newsletter hero, riding the REAL machinery:
// the ivue HorizontalVirtualScroller (the vertical scroller's axis-seam
// subclass) in step mode — every 3 seconds one more post "arrives", the
// way the drip lands one email at a time; wheel and touch scrub the strip
// with lenis physics and snap to card boundaries on settle.
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { withBase } from 'vitepress';
import HorizontalVirtualScroller from '../../../../examples/playground/src/examples/virtual-scroller/HorizontalVirtualScroller.vue';
import type { HorizontalVirtualScrollerExposedUnwrapped } from '../../../../examples/playground/src/examples/virtual-scroller/HorizontalVirtualScroller.vue';
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

const ADVANCE_EVERY_MS = 3000;

const root = ref<HTMLElement | null>(null);
const scroller = ref<HorizontalVirtualScrollerExposedUnwrapped<DripItem> | null>(null);
const arrivingId = ref('');

let timer: ReturnType<typeof setInterval> | undefined;
let arrivingTimer: ReturnType<typeof setTimeout> | undefined;
let observer: IntersectionObserver | undefined;
let inView = false;
let hovering = false;
let current = 0;

function cardStep(): number {
  return scroller.value?.getIndexPosition(1) ?? 320;
}

function fullyVisibleCount(): number {
  const width = root.value?.clientWidth ?? 0;
  const step = cardStep();
  return step > 0 ? Math.max(1, Math.floor(width / step)) : 1;
}

function advance() {
  const scrollerInstance = scroller.value;
  if (!scrollerInstance || !inView || hovering || document.hidden) return;
  if (scrollerInstance.lenis?.isScrolling) return; // the reader owns it
  const visible = fullyVisibleCount();
  current = current + visible >= items.length ? 0 : current + 1;
  scrollerInstance.scrollToIndex(current, () => {
    // the delivery lands on the LAST FULLY VISIBLE card — never the
    // half-clipped one at the strip's masked edge
    const arriving = Math.min(current + visible - 1, items.length - 1);
    arrivingId.value = items[arriving]?.id ?? '';
    clearTimeout(arrivingTimer);
    arrivingTimer = setTimeout(() => (arrivingId.value = ''), 2600);
  });
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
        :assumed-height="330"
        :padding-quantity="6"
        snap-to-items
      >
        <template #item="{ item, index }">
          <a
            class="drip-card"
            :class="{ 'drip-card--arriving': item.id === arrivingId }"
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
  margin: -8px calc(50% - 50vw) 26px;
  /* the strip and the newsletter hero are ONE block — this band's glow
     hands off to the hero's own bottom-anchored glow right below it */
  padding: 26px 0 10px;
}
.drip-showcase::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(60rem 16rem at 50% 0%, rgba(99, 102, 241, 0.08), transparent 70%),
    linear-gradient(180deg, rgba(45, 212, 191, 0.05), transparent 85%);
  pointer-events: none;
}
.drip-showcase .virtual-scroller--x {
  /* cards enter and leave through a soft edge, not a hard clip */
  -webkit-mask-image: linear-gradient(90deg, transparent, black 4%, black 96%, transparent);
  mask-image: linear-gradient(90deg, transparent, black 4%, black 96%, transparent);
}

.drip-card {
  display: block;
  width: clamp(230px, 24vw, 320px);
  padding: 6px 18px 4px 0; /* the right padding IS the gap — uniform card widths */
  text-decoration: none !important;
  cursor: pointer;
}

.drip-card__frame {
  position: relative;
  display: block;
  overflow: hidden;
  border-radius: 12px;
  /* ONE border, no inner padding, no backing panel — the banner is the card */
  border: 1px solid var(--vp-c-divider);
  transition: border-color 0.25s, transform 0.25s, box-shadow 0.25s;
}
.drip-card:hover .drip-card__frame {
  transform: translateY(-3px);
  border-color: var(--ivue-link-accent);
  box-shadow: 0 18px 44px -20px var(--ivue-link-glow);
}

.drip-card__image {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1200 / 630;
  object-fit: cover;
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
  right: 10px;
  bottom: 10px;
  z-index: 2;
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 650;
  letter-spacing: 0.02em;
  color: #06251d;
  background: linear-gradient(90deg, #5eead4, #34d399);
  box-shadow: 0 6px 18px -6px rgba(52, 211, 153, 0.7);
  opacity: 0;
  pointer-events: none;
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
  padding: 0 18px 0 2px; /* optical center over the gap padding */
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
  .drip-card--arriving .drip-card__envelope,
  .drip-card--arriving .drip-card__delivered {
    animation: none;
    display: none;
  }
  .drip-card:hover .drip-card__frame {
    transform: none;
  }
}
</style>

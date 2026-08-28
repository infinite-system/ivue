<script setup lang="ts">
// The inbox preview above the newsletter hero: every post's banner rides a
// full-bleed strip that advances one card at a time — each transition
// "delivers" the newly revealed card out of an envelope, the way the drip
// lands one email at a time in a subscriber's inbox.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { withBase } from 'vitepress';
import { data as allPosts } from '../../../blog/blog.data.mjs';

const posts = allPosts.filter((post) => !post.private && post.image);

const CLONE_COUNT_FLOOR = 8;
const ADVANCE_EVERY_MS = 3000;
const SLIDE_MS = 650;

const root = ref<HTMLElement | null>(null);
const track = ref<HTMLElement | null>(null);
const index = ref(0);
const animated = ref(true);
const arrivingPosition = ref(-1);
const step = ref(0);
const visibleCount = ref(4);

const cloneCount = computed(() =>
  Math.min(posts.length, Math.max(CLONE_COUNT_FLOOR, visibleCount.value + 2)),
);
const cards = computed(() => [...posts, ...posts.slice(0, cloneCount.value)]);

const trackStyle = computed(() => ({
  transform: `translateX(${-index.value * step.value}px)`,
  transition: animated.value ? `transform ${SLIDE_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)` : 'none',
}));

let timer: ReturnType<typeof setInterval> | undefined;
let observer: IntersectionObserver | undefined;
let inView = false;
let hovering = false;
let reducedMotion = false;

function measure() {
  const first = track.value?.querySelector<HTMLElement>('.drip-card');
  if (!first || !track.value) return;
  const gap = parseFloat(getComputedStyle(track.value).columnGap || '0');
  step.value = first.getBoundingClientRect().width + gap;
  if (root.value && step.value) {
    visibleCount.value = Math.max(1, Math.ceil(root.value.clientWidth / step.value));
  }
}

function advance() {
  if (!inView || hovering || document.hidden || !step.value) return;
  animated.value = true;
  index.value += 1;
  // the card that just entered at the right edge is "delivered"
  arrivingPosition.value = index.value + visibleCount.value - 1;
}

function onSlideEnd() {
  if (index.value >= posts.length) {
    // seamless wrap: snap back to the head without a visible jump
    animated.value = false;
    index.value -= posts.length;
    arrivingPosition.value = arrivingPosition.value - posts.length;
  }
}

onMounted(() => {
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  measure();
  window.addEventListener('resize', measure);
  if (reducedMotion || posts.length < 2) return;
  observer = new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
    },
    { threshold: 0.4 },
  );
  if (root.value) observer.observe(root.value);
  timer = setInterval(advance, ADVANCE_EVERY_MS);
});

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
  observer?.disconnect();
  window.removeEventListener('resize', measure);
});
</script>

<template>
  <section
    v-if="posts.length"
    ref="root"
    class="drip-showcase"
    aria-label="Every blog post, delivered one email at a time"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
  >
    <div
      ref="track"
      class="drip-track"
      :style="trackStyle"
      @transitionend.self="onSlideEnd"
    >
      <a
        v-for="(post, position) in cards"
        :key="`${post.slug}-${position}`"
        class="drip-card"
        :class="{ 'drip-card--arriving': position === arrivingPosition }"
        :href="withBase(post.url)"
        tabindex="-1"
      >
        <span class="drip-card__frame">
          <img
            class="drip-card__image"
            :src="withBase(post.image)"
            :alt="post.title"
            width="1200"
            height="630"
            :loading="position < 6 ? 'eager' : 'lazy'"
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
        <span class="drip-card__title">{{ post.title }}</span>
      </a>
    </div>
  </section>
</template>

<style>
.drip-showcase {
  position: relative;
  width: 100vw;
  margin: 64px calc(50% - 50vw) -8px;
  overflow: hidden;
  /* the strip fades at both viewport edges so cards enter and leave softly */
  -webkit-mask-image: linear-gradient(90deg, transparent, black 6%, black 94%, transparent);
  mask-image: linear-gradient(90deg, transparent, black 6%, black 94%, transparent);
}

.drip-track {
  display: flex;
  column-gap: 18px;
  padding: 6px 0 2px;
  will-change: transform;
}

.drip-card {
  flex: 0 0 clamp(230px, 24vw, 330px);
  text-decoration: none !important;
  cursor: pointer;
}

.drip-card__frame {
  position: relative;
  display: block;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  transition: border-color 0.25s, transform 0.25s;
}
.drip-card:hover .drip-card__frame {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
}

.drip-card__image {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1200 / 630;
}

/* the delivery: the arriving card starts as a sealed envelope face that
   lifts open to reveal the banner, then a small "Delivered" receipt pops */
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
}
.drip-card__envelope svg {
  width: 34%;
  height: 34%;
  filter: drop-shadow(0 0 18px rgba(99, 102, 241, 0.55));
}

.drip-card__delivered {
  position: absolute;
  right: 8px;
  bottom: 8px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #06251d;
  background: linear-gradient(90deg, #5eead4, #34d399);
  opacity: 0;
  pointer-events: none;
}

.drip-card--arriving .drip-card__envelope {
  display: flex;
  animation: drip-open 0.9s cubic-bezier(0.55, 0, 0.3, 1) 0.45s both;
}
.drip-card--arriving .drip-card__delivered {
  animation: drip-receipt 1.6s ease 1.15s both;
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
  18%,
  78% {
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
  margin-top: 8px;
  padding: 0 2px;
  font-size: 13px;
  line-height: 1.4;
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
}
</style>

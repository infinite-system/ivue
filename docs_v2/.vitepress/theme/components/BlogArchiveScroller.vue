<script setup lang="ts">
// The blog archive, scrolled by the production VirtualScroller from the
// examples — the same class the docs demonstrate, dogfooding as a footer.
// Auto-plays only while visible; the right-hand scrollbar is draggable
// and reflects the VIRTUAL position (native scrollTop stays 0 by design).
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, withBase } from 'vitepress';
import VirtualScroller from '../../../../examples/playground/src/examples/virtual-scroller/VirtualScroller.vue';
import type { VirtualScrollerExposedUnwrapped } from '../../../../examples/playground/src/examples/virtual-scroller/VirtualScroller.vue';
import type { BaseItem } from '../../../../examples/playground/src/examples/virtual-scroller/VirtualScroller.types';
import { data as posts } from '../../../blog/blog.data.mjs';

interface ArchiveItem extends BaseItem {
  url: string;
  title: string;
  date: string;
}

const route = useRoute();
const isBlogPost = computed(
  () => /^\/blog\/.+/.test(route.path) && !route.path.endsWith('/blog/'),
);

const archiveItems = computed<ArchiveItem[]>(() =>
  posts
    .filter((post) => post.url !== route.path.replace(/\.html$/, ''))
    .map((post) => ({
      id: post.slug,
      body: '',
      position: '',
      url: post.url,
      title: post.title,
      date: post.date,
    })),
);

function formatDate(date: string): string {
  return new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

const scroller = ref<VirtualScrollerExposedUnwrapped<ArchiveItem> | null>(null);
const viewport = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

// ClientOnly mounts its children AFTER this component's onMounted, so
// the viewport ref fills late — watch it instead of assuming mount order.
watch(viewport, (element) => {
  if (!element || observer) return;
  observer = new IntersectionObserver(
    ([entry]) => {
      if (!scroller.value) return;
      if (entry.isIntersecting) scroller.value.startAutoPlay(700);
      else scroller.value.stopAutoPlay();
    },
    { threshold: 0.35 },
  );
  observer.observe(element);
});

onBeforeUnmount(() => observer?.disconnect());

// ---- the visible, draggable scrollbar over VIRTUAL position ----
const dragging = ref(false);

const geometry = computed(() => {
  const instance = scroller.value;
  if (!instance) return null;
  const total = Number(instance.scrollHeight) || 0;
  const container = Number(instance.containerHeight) || 0;
  if (total <= container || container === 0) return null;
  const position = parseFloat(String(instance.scrollPosition)) || 0;
  const thumbFraction = Math.max(container / total, 0.08);
  const travel = 1 - thumbFraction;
  const progress = Math.min(position / (total - container), 1);
  return {
    thumbHeightPercent: thumbFraction * 100,
    thumbTopPercent: progress * travel * 100,
  };
});

function seekToPointer(event: PointerEvent) {
  const instance = scroller.value;
  const track = (event.currentTarget as HTMLElement).closest('.blog-archive__track') as HTMLElement;
  if (!instance || !track || !instance.lenis) return;
  const rect = track.getBoundingClientRect();
  const fraction = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1);
  const total = Number(instance.scrollHeight) || 0;
  const container = Number(instance.containerHeight) || 0;
  instance.lenis.scrollTo(fraction * (total - container), { immediate: true });
}

function onTrackPointerDown(event: PointerEvent) {
  scroller.value?.stopAutoPlay();
  dragging.value = true;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  seekToPointer(event);
}

function onTrackPointerMove(event: PointerEvent) {
  if (dragging.value) seekToPointer(event);
}

function onTrackPointerUp() {
  dragging.value = false;
}
</script>

<template>
  <section v-if="isBlogPost" class="blog-archive" aria-label="More posts">
    <span class="blog-archive__label">More from the blog</span>
    <ClientOnly>
      <div ref="viewport" class="blog-archive__viewport">
        <VirtualScroller
          ref="scroller"
          :model-value="archiveItems"
          :assumed-height="44"
          :padding-quantity="4"
          :auto-play="false"
          auto-repeat
        >
          <template #item="{ item }">
            <a class="blog-archive__row" :href="withBase(item.url)">
              <span class="blog-archive__title">{{ item.title }}</span>
              <span class="blog-archive__date">{{ formatDate(item.date) }}</span>
            </a>
          </template>
        </VirtualScroller>
        <div
          class="blog-archive__track"
          @pointerdown="onTrackPointerDown"
          @pointermove="onTrackPointerMove"
          @pointerup="onTrackPointerUp"
          @pointercancel="onTrackPointerUp"
        >
          <div
            v-if="geometry"
            class="blog-archive__thumb"
            :class="{ dragging }"
            :style="{ height: geometry.thumbHeightPercent + '%', top: geometry.thumbTopPercent + '%' }"
          ></div>
        </div>
      </div>
    </ClientOnly>
  </section>
</template>

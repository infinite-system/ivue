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
import { data as allPosts } from '../../../blog/blog.data.mjs';

// private posts (dev-only artifacts) stay out of the archive rail
const posts = allPosts.filter((post) => !post.private);

interface ArchiveItem extends BaseItem {
  url: string;
  title: string;
  excerpt: string;
  date: string;
  current: boolean;
}

const route = useRoute();
const isBlogPost = computed(
  () => /^\/blog\/.+/.test(route.path) && !route.path.endsWith('/blog/'),
);

// posts arrive newest-first from the loader; the current article stays
// in the list, marked as the one being read.
const archiveItems = computed<ArchiveItem[]>(() => {
  const currentUrl = route.path.replace(/\.html$/, '');
  return posts.map((post) => ({
    id: post.slug,
    body: '',
    position: '',
    url: post.url,
    title: post.title,
    excerpt: post.excerpt,
    date: post.date,
    current: post.url === currentUrl,
  }));
});

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
          scrollbar
        >
          <template #item="{ item }">
            <a
              class="blog-archive__row"
              :class="{ 'blog-archive__row--current': item.current }"
              :href="withBase(item.url)"
              :aria-current="item.current ? 'page' : undefined"
            >
              <span class="blog-archive__title">{{ item.title }}</span>
              <span class="blog-archive__excerpt">{{ item.excerpt }}</span>
              <span class="blog-archive__date">{{ formatDate(item.date) }}</span>
            </a>
          </template>
        </VirtualScroller>
      </div>
    </ClientOnly>
  </section>
</template>

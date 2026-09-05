<script setup lang="ts">
import VirtualScroller from '../../../../examples/playground/src/examples/virtual-scroller/VirtualScroller.vue';
import { BlogArchiveScroller } from './BlogArchiveScroller';

const archive = new BlogArchiveScroller.Class();

// the state destructure
const {
  // computed refs
  archiveItems,
  // element refs
  scroller,
  viewport,
} = archive;
</script>

<template>
  <section v-if="archive.isBlogPost" class="blog-archive" aria-label="More posts">
    <span class="blog-archive__label">More from the blog</span>
    <ClientOnly>
      <div ref="viewport" class="blog-archive__viewport">
        <VirtualScroller
          ref="scroller"
          :model-value="archiveItems"
          :assumed-size="44"
          :padding-quantity="4"
          :auto-play="false"
          auto-repeat
          scrollbar
        >
          <template #item="{ item }">
            <a
              class="blog-archive__row"
              :class="{ 'blog-archive__row--current': item.current }"
              :href="archive.rowHref(item)"
              :aria-current="archive.rowAriaCurrent(item)"
            >
              <span class="blog-archive__title">{{ item.title }}</span>
              <span class="blog-archive__excerpt">{{ item.excerpt }}</span>
              <span class="blog-archive__date">{{ archive.formatDate(item.date) }}</span>
            </a>
          </template>
        </VirtualScroller>
      </div>
    </ClientOnly>
  </section>
</template>

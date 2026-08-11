<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, withBase } from 'vitepress';
import { data as posts } from '../../../blog/blog.data.mjs';

const route = useRoute();
const isBlogPost = computed(
  () => /^\/blog\/.+/.test(route.path) && !route.path.endsWith('/blog/'),
);

// posts are sorted newest-first; "older" walks forward in the array.
const currentIndex = computed(() =>
  posts.findIndex(
    (post) => post.url === route.path.replace(/\.html$/, ''),
  ),
);
const newerPost = computed(() =>
  currentIndex.value > 0 ? posts[currentIndex.value - 1] : null,
);
const olderPost = computed(() =>
  currentIndex.value >= 0 && currentIndex.value < posts.length - 1
    ? posts[currentIndex.value + 1]
    : null,
);

function formatDate(date: string): string {
  return new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
</script>

<template>
  <nav
    v-if="isBlogPost && (olderPost || newerPost)"
    class="blog-post-nav"
    aria-label="More posts"
  >
    <a
      v-if="olderPost"
      class="blog-post-nav__card"
      :href="withBase(olderPost.url)"
    >
      <img class="blog-post-nav__thumb" :src="withBase(olderPost.image)" :alt="olderPost.title" loading="lazy" />
      <div class="blog-post-nav__body">
        <span class="blog-post-nav__label">← Older post</span>
        <span class="blog-post-nav__title">{{ olderPost.title }}</span>
        <span class="blog-post-nav__date">{{ formatDate(olderPost.date) }}</span>
      </div>
    </a>
    <span v-else class="blog-post-nav__spacer" aria-hidden="true"></span>
    <a
      v-if="newerPost"
      class="blog-post-nav__card blog-post-nav__card--newer"
      :href="withBase(newerPost.url)"
    >
      <div class="blog-post-nav__body">
        <span class="blog-post-nav__label">Newer post →</span>
        <span class="blog-post-nav__title">{{ newerPost.title }}</span>
        <span class="blog-post-nav__date">{{ formatDate(newerPost.date) }}</span>
      </div>
      <img class="blog-post-nav__thumb" :src="withBase(newerPost.image)" :alt="newerPost.title" loading="lazy" />
    </a>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, withBase } from 'vitepress';
import { data as allPosts } from '../../../blog/blog.data.mjs';

// private posts (dev-only artifacts) never appear in prev/next — the
// walk sees exactly what production publishes
const posts = allPosts.filter((post) => !post.private);

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
      </div>
    </a>
    <span v-else class="blog-post-nav__spacer" aria-hidden="true"></span>
    <a
      v-if="newerPost"
      class="blog-post-nav__card blog-post-nav__card--newer"
      :href="withBase(newerPost.url)"
    >
      <img class="blog-post-nav__thumb" :src="withBase(newerPost.image)" :alt="newerPost.title" loading="lazy" />
      <div class="blog-post-nav__body">
        <span class="blog-post-nav__label">Newer post →</span>
        <span class="blog-post-nav__title">{{ newerPost.title }}</span>
      </div>
    </a>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, withBase } from 'vitepress';
import { data as posts } from '../../../blog/blog.data.mjs';

const route = useRoute();
const post = computed(() =>
  posts.find((entry) => entry.url === route.path.replace(/\.html$/, '')),
);

const formattedDate = computed(() => {
  if (!post.value) return '';
  return new Date(post.value.date + 'T00:00:00Z').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
});
</script>

<template>
  <!-- the date moved to the doc footer (BlogPublishedDate) — the
       content is invariant-timeless, so the top of the post leads
       with tags only; the date stays findable at the bottom -->
  <p v-if="post && post.tags.length" class="blog-post-date">
    <span class="blog-post-tags">
      <a
        v-for="tag in post.tags"
        :key="tag"
        class="blog-post-tag"
        :href="withBase(`/blog/?tag=${tag}`)"
        >{{ tag }}</a
      >
    </span>
  </p>
</template>

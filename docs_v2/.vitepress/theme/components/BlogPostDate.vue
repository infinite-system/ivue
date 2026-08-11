<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vitepress';
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
  <p v-if="post" class="blog-post-date">
    <time :datetime="post.date">{{ formattedDate }}</time>
  </p>
</template>

<script setup lang="ts">
import { BlogPublishedDate } from './BlogPublishedDate';

const stamp = new BlogPublishedDate.Class();

// the state destructure
const {
  // state refs
  published,
  updated,
} = stamp;
</script>

<template>
  <p v-if="stamp.hasRecord" class="blog-published-date">
    <span v-if="published">Published: <time>{{ published }}</time></span>
    <span v-if="updated">Last updated: <time>{{ updated }}</time></span>
  </p>
</template>

<style scoped>
/* same faint metadata voice as the native Last-updated line */
.blog-published-date {
  margin: 24px 0 -20px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.7;
  color: var(--vp-c-text-3);
  opacity: 0.75;
}
</style>

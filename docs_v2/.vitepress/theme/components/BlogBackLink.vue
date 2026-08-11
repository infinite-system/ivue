<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, withBase } from 'vitepress';

const route = useRoute();
const isBlogPost = computed(
  () => /^\/blog\/.+/.test(route.path) && !route.path.endsWith('/blog/'),
);
</script>

<template>
  <!-- mobile-only escape hatch back to the index (CSS hides it wide) -->
  <a v-if="isBlogPost" class="blog-back" :href="withBase('/blog/')">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m10.8 12 4.9-4.9-1.4-1.4L8 12l6.3 6.3 1.4-1.4-4.9-4.9Z"/></svg>
    Back to Blog
  </a>
</template>

<script setup lang="ts">
// The post's dates, relocated from under the title to the doc footer:
// the content is invariant-timeless, so a date shouldn't be the first
// thing a reader weighs — but both dates stay findable at the bottom.
// Renders Published THEN Last updated in one metadata block (the
// native .last-updated is hidden on blog posts — see custom.css).
import { computed, onMounted, ref } from 'vue';
import { useData, useRoute } from 'vitepress';
import dates from '../../../blog/blog-dates.json';

const route = useRoute();
const { page } = useData();

const slug = computed(() => {
  const match = route.path.match(/^\/blog\/([^/]+?)(?:\.html)?$/);
  return match ? match[1] : null;
});

const record = computed(() =>
  slug.value ? (dates as Record<string, { timestamp?: number }>)[slug.value] : null,
);

// format on the client only — toLocaleString differs across SSR and
// browser environments, and a mismatch breaks hydration
const published = ref('');
const updated = ref('');
function formatStamp(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
onMounted(() => {
  if (record.value?.timestamp)
    published.value = formatStamp(record.value.timestamp * 1000);
  if (page.value.lastUpdated) updated.value = formatStamp(page.value.lastUpdated);
});
</script>

<template>
  <p v-if="record" class="blog-published-date">
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

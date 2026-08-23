<script setup lang="ts">
import { computed } from 'vue';
import { useData, withBase } from 'vitepress';
import { data as posts } from '../../../blog/blog-lite.data.mjs';

// "From the blog" — the aside block that turns reference pages into
// blog on-ramps. Curation is explicit frontmatter (relatedPosts:
// [slug, …]) per page; pages without the key render nothing. Compact
// rows on purpose: in a 240px column, recognition beats spectacle —
// a small banner thumb, the title doing the work, a muted date.
const props = withDefaults(
  defineProps<{ variant?: 'aside' | 'doc' }>(),
  { variant: 'aside' },
);

const { frontmatter } = useData();

const relatedPosts = computed(() => {
  const slugs: string[] = frontmatter.value.relatedPosts ?? [];
  return slugs
    .map((slug) => posts.find((post) => post.slug === slug))
    .filter((post): post is (typeof posts)[number] => Boolean(post));
});

function formatDate(date: string): string {
  return new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
</script>

<template>
  <nav
    v-if="relatedPosts.length"
    class="related-posts"
    :class="`related-posts--${props.variant}`"
    aria-label="Related blog posts"
  >
    <p class="related-posts__heading">From the blog</p>
    <a
      v-for="post in relatedPosts"
      :key="post.slug"
      class="related-posts__item"
      :href="withBase(post.url)"
    >
      <img
        class="related-posts__thumb"
        :src="withBase(post.image)"
        :alt="post.title"
        width="1200"
        height="630"
        loading="lazy"
      />
      <span class="related-posts__body">
        <span class="related-posts__title">{{ post.title }}</span>
        <span class="related-posts__date">{{ formatDate(post.date) }}</span>
      </span>
    </a>
  </nav>
</template>

<style scoped>
.related-posts {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--vp-c-divider);
}
/* end-of-content variant: a compact card grid */
.related-posts--doc {
  margin-top: 40px;
  padding-top: 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 14px;
}
.related-posts--doc .related-posts__heading {
  grid-column: 1 / -1;
  margin-bottom: 0;
}
.related-posts--doc .related-posts__item {
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  padding: 0;
}
.related-posts--doc .related-posts__thumb {
  width: 100%;
  height: auto;
  aspect-ratio: 1200 / 630;
  border-radius: 8px;
}
.related-posts__heading {
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}
.related-posts__item {
  display: flex;
  align-items: flex-start; /* thumb rides the title's first line */
  gap: 10px;
  padding: 6px 0;
  text-decoration: none;
}
.related-posts--aside .related-posts__thumb {
  margin-top: 2px; /* optical alignment with the title's cap height */
}
.related-posts__thumb {
  flex: none;
  width: 76px;
  height: 40px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  transition: border-color 0.15s ease;
}
.related-posts__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.related-posts__title {
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--vp-c-text-1);
  transition: color 0.15s ease;
}
.related-posts__date {
  font-size: 11px;
  color: var(--vp-c-text-3);
}
.related-posts__item:hover .related-posts__title {
  color: var(--vp-c-brand-1);
}
.related-posts__item:hover .related-posts__thumb {
  border-color: var(--vp-c-brand-1);
}
</style>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useData, useRoute, withBase } from 'vitepress';
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

const { frontmatter, page } = useData();
const route = useRoute();

// On a blog post the block lists PEERS — "Related posts". On guide
// pages it is an on-ramp from reference into the blog — "From the
// blog" says where the reader is being invited.
const isBlogPost = computed(
  () => /^\/blog\/.+/.test(route.path) && !route.path.endsWith('/blog/'),
);
const heading = computed(() =>
  isBlogPost.value ? 'Related posts' : 'From the blog',
);

// frontmatter may list any number of slugs, strongest first. The
// aside stays capped at three (a calm column, no controls); the doc
// grid shows three and expands on demand — a button, not a slider:
// hidden-by-carousel content barely gets touched, and post pages
// already have one slider (the archive rail).
const VISIBLE_COUNT = 3;
const expanded = ref(false);

const allRelatedPosts = computed(() => {
  const slugs: string[] = frontmatter.value.relatedPosts ?? [];
  return slugs
    .map((slug) => posts.find((post) => post.slug === slug))
    .filter((post): post is (typeof posts)[number] => Boolean(post));
});

const relatedPosts = computed(() => {
  if (props.variant === 'aside') return allRelatedPosts.value.slice(0, VISIBLE_COUNT);
  if (expanded.value) return allRelatedPosts.value;
  return allRelatedPosts.value.slice(0, VISIBLE_COUNT);
});

const hiddenCount = computed(() =>
  props.variant === 'doc' && !expanded.value
    ? allRelatedPosts.value.length - VISIBLE_COUNT
    : 0,
);

// a route change collapses the grid again
watch(
  () => page.value.relativePath,
  () => {
    expanded.value = false;
  },
);


</script>

<template>
  <nav
    v-if="relatedPosts.length"
    class="related-posts"
    :class="`related-posts--${props.variant}`"
    aria-label="Related blog posts"
  >
    <p class="related-posts__heading">{{ heading }}</p>
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
      </span>
    </a>
    <button
      v-if="hiddenCount > 0"
      type="button"
      class="related-posts__more"
      @click="expanded = true"
    >
      {{ isBlogPost ? `More related posts (${hiddenCount})` : `Show ${hiddenCount} more from the blog` }}
    </button>
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
  margin-bottom: 34px;
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
/* breathing room so the title doesn't sit flush with the thumb edges */
.related-posts--doc .related-posts__body {
  padding: 0 8px 4px;
  text-align: center;
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
/* sidebar rows: title centers on the thumb's vertical middle */
.related-posts--aside .related-posts__item {
  align-items: center;
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
  color: var(--vp-c-text-1); /* like the prev/next card titles */
  transition: color 0.15s ease;
}
.related-posts__item:hover .related-posts__thumb {
  border-color: var(--ivue-link-accent);
  box-shadow: 0 12px 30px -18px var(--ivue-link-glow);
}
.related-posts__more {
  grid-column: 1 / -1;
  justify-self: center;
  margin-top: -4px; /* pull against the grid gap — the button belongs to the cards */
  padding: 6px 18px;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  transition:
    color 0.2s,
    border-color 0.2s;
}
.related-posts__more:hover {
  color: var(--ivue-link-accent);
  border-color: var(--ivue-link-accent);
}
/* mobile: the doc grid collapses to the aside's row form — small
   thumb beside the title beats stacked full-width cards on a phone */
@media (max-width: 640px) {
  .related-posts--doc {
    display: block;
  }
  .related-posts--doc .related-posts__heading {
    margin-bottom: 10px;
  }
  .related-posts--doc .related-posts__item {
    flex-direction: row;
    align-items: center; /* title on the thumb's vertical middle */
    gap: 10px;
    padding: 6px 0;
  }
  /* row form: the thumb already offsets the text — no extra indent,
     and left alignment beside the thumb */
  .related-posts--doc .related-posts__body {
    padding: 0;
    text-align: left;
  }
  .related-posts--doc .related-posts__thumb {
    width: 76px;
    height: 40px;
    aspect-ratio: auto;
    margin-top: 0;
    border-radius: 6px;
  }
  .related-posts--doc .related-posts__more {
    display: block;
    margin: 8px auto 0;
  }
}
</style>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, withBase } from 'vitepress';
import { data as posts } from '../../../blog/blog.data.mjs';
import { rankPosts } from '../blog-search';

// The blog rail's head: the All-articles link plus a search box that
// searches the whole archive — titles, tags, excerpts AND body text —
// ranked exactly like the index page's search (blog-search.ts). While
// a query is typed the month groups step aside and the ranked results
// take their place; clearing brings the months back. The main content
// is never touched.
const route = useRoute();
const isBlogSection = computed(() => route.path.startsWith('/blog'));
const isBlogIndex = computed(() => /^\/blog\/?(index\.html)?$/.test(route.path));

const query = ref('');
const searching = computed(() => query.value.trim().length > 0);
const publicPosts = posts.filter((post) => !post.private);
const results = computed(() =>
  searching.value ? rankPosts(publicPosts, query.value) : [],
);

function isCurrent(url: string): boolean {
  return route.path.replace(/\.html$/, '') === url.replace(/\.html$/, '');
}

function shortDate(date: string): string {
  return new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

// the month groups are VitePress DOM — hidden by a class on the rail
// while searching, re-asserted after each navigation (the rail re-renders)
const HIDDEN = 'blog-rail-searching';
function syncGroups() {
  document
    .querySelector('.VPSidebar')
    ?.classList.toggle(HIDDEN, searching.value && isBlogSection.value);
}
watch([searching, () => route.path], () => nextTick(syncGroups));

function clear() {
  query.value = '';
}
onBeforeUnmount(() => {
  query.value = '';
  syncGroups();
});
</script>

<template>
  <div v-if="isBlogSection" class="blog-rail-head">
    <a
      class="blog-rail-all"
      :class="{ active: isBlogIndex }"
      :href="withBase('/blog/')"
    >All articles</a>
    <div class="blog-rail-search">
      <svg class="blog-rail-search__icon" width="13" height="13" viewBox="0 0 15 15" fill="none" aria-hidden="true">
        <circle cx="6.5" cy="6.5" r="4.6" stroke="currentColor" stroke-width="1.6" />
        <path d="m10.3 10.3 3.2 3.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
      </svg>
      <input
        v-model="query"
        type="search"
        class="blog-rail-search__input"
        placeholder="Search articles…"
        aria-label="Search articles"
      />
      <button
        v-if="query"
        type="button"
        class="blog-rail-search__clear"
        aria-label="Clear search"
        @click="clear"
      >×</button>
    </div>
    <div v-if="searching" class="blog-rail-results" role="list">
      <p class="blog-rail-results__count">
        {{ results.length }} match{{ results.length === 1 ? '' : 'es' }}
      </p>
      <a
        v-for="post in results"
        :key="post.slug"
        class="blog-rail-result"
        :class="{ active: isCurrent(post.url) }"
        :href="withBase(post.url)"
        role="listitem"
      >
        {{ post.title }}
        <span class="blog-rail-result__date">{{ shortDate(post.date) }}</span>
      </a>
    </div>
  </div>
</template>

<style scoped>
.blog-rail-head {
  padding: 0 0 12px;
}
.blog-rail-all {
  display: block;
  padding: 4px 0;
  line-height: 24px;
  font-size: 14px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: color 0.2s;
}
.blog-rail-all:hover,
.blog-rail-all.active {
  color: var(--ivue-link-2);
}
.blog-rail-search {
  position: relative;
  display: flex;
  align-items: center;
  margin-top: 6px;
}
.blog-rail-search__icon {
  position: absolute;
  left: 10px;
  color: var(--vp-c-text-3);
  pointer-events: none;
}
.blog-rail-search__input {
  width: 100%;
  height: 32px;
  padding: 0 28px 0 29px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 13px;
  transition: border-color 0.15s ease;
}
.blog-rail-search__input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}
.blog-rail-search__input::-webkit-search-cancel-button {
  display: none;
}
.blog-rail-search__clear {
  position: absolute;
  right: 6px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: var(--vp-c-text-3);
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
}
.blog-rail-search__clear:hover {
  color: var(--vp-c-text-1);
}
/* ranked results: the same row anatomy as the month lists (13px title,
   small grey date, dotted separators) so the swap reads as a re-sort */
.blog-rail-results {
  margin-top: 12px;
}
.blog-rail-results__count {
  margin: 0 0 4px;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-3);
}
.blog-rail-result {
  display: block;
  padding: 7px 0;
  border-bottom: 1px dotted var(--vp-c-divider);
  font-size: 13px;
  line-height: 24px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  text-decoration: none;
  transition: color 0.2s;
}
.blog-rail-result:last-child {
  border-bottom: none;
}
.blog-rail-result:hover,
.blog-rail-result.active {
  color: var(--ivue-link-2);
}
.blog-rail-result__date {
  margin-left: 7px;
  font-size: 10px;
  font-weight: 400;
  color: var(--vp-c-text-3);
  opacity: 0.62;
  white-space: nowrap;
}
</style>

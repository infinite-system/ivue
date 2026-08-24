<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue';
import { useRoute, useRouter, withBase } from 'vitepress';
import { blogSearchQuery } from '../blog-search-state';

// The blog rail's head: the All-posts link plus a search box that
// drives the SAME query as the index page's search (shared ref). On a
// post page, typing carries the reader to the index — the query is
// already set when the index mounts, so the list arrives filtered.
const route = useRoute();
const router = useRouter();

const isBlogSection = computed(() => route.path.startsWith('/blog'));
const isBlogIndex = computed(() => /^\/blog\/?(index\.html)?$/.test(route.path));

let navigateTimer: ReturnType<typeof setTimeout> | undefined;
function goToIndex() {
  clearTimeout(navigateTimer);
  if (!isBlogIndex.value) router.go(withBase('/blog/'));
}
function onInput() {
  clearTimeout(navigateTimer);
  if (isBlogIndex.value || !blogSearchQuery.value.trim()) return;
  navigateTimer = setTimeout(goToIndex, 450);
}
function clear() {
  blogSearchQuery.value = '';
  clearTimeout(navigateTimer);
}
onBeforeUnmount(() => clearTimeout(navigateTimer));
</script>

<template>
  <div v-if="isBlogSection" class="blog-rail-head">
    <a
      class="blog-rail-all"
      :class="{ active: isBlogIndex }"
      :href="withBase('/blog/')"
    >All posts</a>
    <div class="blog-rail-search">
      <svg class="blog-rail-search__icon" width="13" height="13" viewBox="0 0 15 15" fill="none" aria-hidden="true">
        <circle cx="6.5" cy="6.5" r="4.6" stroke="currentColor" stroke-width="1.6" />
        <path d="m10.3 10.3 3.2 3.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
      </svg>
      <input
        v-model="blogSearchQuery"
        type="search"
        class="blog-rail-search__input"
        placeholder="Search posts…"
        aria-label="Search posts"
        @input="onInput"
        @keydown.enter.prevent="goToIndex"
      />
      <button
        v-if="blogSearchQuery"
        type="button"
        class="blog-rail-search__clear"
        aria-label="Clear search"
        @click="clear"
      >×</button>
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
</style>

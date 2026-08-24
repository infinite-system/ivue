<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, withBase } from 'vitepress';

// The blog rail's head: the All-newsletters link plus a search box that
// filters the RAIL — post titles that don't match are hidden, and a
// month whose posts are all hidden folds away with them. The main
// content is untouched; the index page has its own search.
const route = useRoute();
const isBlogSection = computed(() => route.path.startsWith('/blog'));
const isBlogIndex = computed(() => /^\/blog\/?(index\.html)?$/.test(route.path));

const query = ref('');
const HIDDEN = 'blog-rail-hidden';

function applyFilter() {
  const words = query.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const groups = document.querySelectorAll<HTMLElement>(
    '.VPSidebar .VPSidebarItem.level-0',
  );
  for (const group of groups) {
    let visibleCount = 0;
    for (const item of group.querySelectorAll<HTMLElement>('.VPSidebarItem.level-1')) {
      const title = (item.querySelector('.link .text')?.textContent ?? '')
        .replace(/\s+\w{3} \d{1,2}\s*$/, '') // drop the date suffix
        .toLowerCase();
      const matches = words.every((word) => title.includes(word));
      item.classList.toggle(HIDDEN, !matches);
      if (matches) visibleCount++;
    }
    group.classList.toggle(HIDDEN, visibleCount === 0);
  }
}

// re-apply after each navigation — VitePress re-renders the rail items
watch([query, () => route.path], () => nextTick(applyFilter));

function clear() {
  query.value = '';
}
onBeforeUnmount(() => {
  query.value = '';
  applyFilter();
});
</script>

<template>
  <div v-if="isBlogSection" class="blog-rail-head">
    <a
      class="blog-rail-all"
      :class="{ active: isBlogIndex }"
      :href="withBase('/blog/')"
    >All newsletters</a>
    <div class="blog-rail-search">
      <svg class="blog-rail-search__icon" width="13" height="13" viewBox="0 0 15 15" fill="none" aria-hidden="true">
        <circle cx="6.5" cy="6.5" r="4.6" stroke="currentColor" stroke-width="1.6" />
        <path d="m10.3 10.3 3.2 3.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
      </svg>
      <input
        v-model="query"
        type="search"
        class="blog-rail-search__input"
        placeholder="Search newsletters…"
        aria-label="Search newsletters"
      />
      <button
        v-if="query"
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

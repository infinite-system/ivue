<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { onMounted } from 'vue';
import { withBase } from 'vitepress';
import { data as posts } from '../../../blog/blog.data.mjs';

type ViewStyle = 'list' | 'cards';
const VIEW_STORAGE_KEY = 'ivue-blog-view';

// List is the default; the visitor's last choice persists per browser.
const viewStyle = ref<ViewStyle>('list');

// ---- tag filter ----------------------------------------------------
// Tags come from post frontmatter; the cloud shows each with its count.
const activeTag = ref<string | null>(null);

const tagCounts = computed(() => {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort(
    (first, second) => second[1] - first[1] || first[0].localeCompare(second[0]),
  );
});

const filteredPosts = computed(() =>
  activeTag.value
    ? posts.filter((post) => post.tags.includes(activeTag.value!))
    : posts,
);

function toggleTag(tag: string) {
  activeTag.value = activeTag.value === tag ? null : tag;
}

// ---- pagination ----------------------------------------------------
const PAGE_SIZE = 100;
const page = ref(1);

const pageCount = computed(() =>
  Math.max(1, Math.ceil(filteredPosts.value.length / PAGE_SIZE)),
);
const pagedPosts = computed(() =>
  filteredPosts.value.slice(
    (page.value - 1) * PAGE_SIZE,
    page.value * PAGE_SIZE,
  ),
);

// a narrower filter can strand the page index — snap back into range,
// and any filter change starts from page 1
watch(activeTag, () => {
  page.value = 1;
});

function goToPage(target: number) {
  page.value = Math.min(Math.max(1, target), pageCount.value);
  document
    .querySelector('.blog-index-toolbar')
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

onMounted(() => {
  const stored = localStorage.getItem(VIEW_STORAGE_KEY);
  if (stored === 'cards' || stored === 'list') {
    viewStyle.value = stored;
  }
  // freshness is judged client-side after mount — no hydration mismatch
  nowSeconds.value = Math.floor(Date.now() / 1000);
});

const FRESH_WINDOW_SECONDS = 14 * 86_400;
const nowSeconds = ref(0);

function isNew(post: { timestamp: number }): boolean {
  return (
    nowSeconds.value > 0 &&
    nowSeconds.value - post.timestamp < FRESH_WINDOW_SECONDS
  );
}

function setViewStyle(style: ViewStyle) {
  viewStyle.value = style;
  localStorage.setItem(VIEW_STORAGE_KEY, style);
}

function formatDate(date: string): string {
  return new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
</script>

<template>
  <div class="blog-index-toolbar">
    <div class="blog-index-heading">
      <h1>Blog</h1>
      <span class="blog-count">{{ posts.length }} posts</span>
    </div>
    <div class="blog-view-toggle" role="group" aria-label="Display style">
      <button
        type="button"
        :class="{ active: viewStyle === 'list' }"
        aria-label="List view"
        :aria-pressed="viewStyle === 'list'"
        @click="setViewStyle('list')"
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <rect x="1" y="2" width="13" height="2.4" rx="1" fill="currentColor" />
          <rect x="1" y="6.3" width="13" height="2.4" rx="1" fill="currentColor" />
          <rect x="1" y="10.6" width="13" height="2.4" rx="1" fill="currentColor" />
        </svg>
        List
      </button>
      <button
        type="button"
        :class="{ active: viewStyle === 'cards' }"
        aria-label="Card view"
        :aria-pressed="viewStyle === 'cards'"
        @click="setViewStyle('cards')"
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <rect x="1" y="1" width="5.8" height="5.8" rx="1.2" fill="currentColor" />
          <rect x="8.2" y="1" width="5.8" height="5.8" rx="1.2" fill="currentColor" />
          <rect x="1" y="8.2" width="5.8" height="5.8" rx="1.2" fill="currentColor" />
          <rect x="8.2" y="8.2" width="5.8" height="5.8" rx="1.2" fill="currentColor" />
        </svg>
        Cards
      </button>
    </div>
  </div>

  <div class="blog-tag-cloud" role="group" aria-label="Filter posts by tag">
    <button
      v-for="[tag, count] in tagCounts"
      :key="tag"
      type="button"
      class="blog-tag"
      :class="{ active: activeTag === tag }"
      :aria-pressed="activeTag === tag"
      @click="toggleTag(tag)"
    >
      {{ tag }}<span class="n">{{ count }}</span>
    </button>
    <button
      v-if="activeTag"
      type="button"
      class="blog-tag blog-tag--clear"
      @click="activeTag = null"
    >
      clear ×
    </button>
  </div>

  <div v-if="viewStyle === 'cards'" class="blog-list">
    <a v-for="post in pagedPosts" :key="post.slug" class="blog-card" :href="withBase(post.url)">
      <img
        class="thumb"
        :src="withBase(post.image)"
        :alt="post.title"
        width="1200"
        height="630"
        loading="lazy"
      />
      <span v-if="isNew(post)" class="new-badge new-badge--thumb">NEW</span>
      <div class="body">
        <h2>{{ post.title }}</h2>
        <p class="excerpt">{{ post.excerpt }}</p>
        <div class="foot">
          <span class="date">{{ formatDate(post.date) }}</span>
          <span class="go">Read the post →</span>
        </div>
      </div>
    </a>
  </div>

  <div v-else class="blog-rows">
    <a v-for="post in pagedPosts" :key="post.slug" class="blog-row" :href="withBase(post.url)">
      <img
        class="thumb"
        :src="withBase(post.image)"
        :alt="post.title"
        width="1200"
        height="630"
        loading="lazy"
      />
      <span v-if="isNew(post)" class="new-badge new-badge--thumb">NEW</span>
      <div class="body">
        <h2>{{ post.title }}</h2>
        <p class="excerpt">{{ post.excerpt }}</p>
        <div class="foot">
          <span class="date">{{ formatDate(post.date) }}</span>
          <span class="go">Read the post →</span>
        </div>
      </div>
    </a>
  </div>

  <nav v-if="pageCount > 1" class="blog-pager" aria-label="Blog pages">
    <button
      type="button"
      class="blog-pager__step"
      :disabled="page === 1"
      @click="goToPage(page - 1)"
    >
      ← Newer
    </button>
    <button
      v-for="pageNumber in pageCount"
      :key="pageNumber"
      type="button"
      class="blog-pager__page"
      :class="{ active: pageNumber === page }"
      :aria-current="pageNumber === page ? 'page' : undefined"
      @click="goToPage(pageNumber)"
    >
      {{ pageNumber }}
    </button>
    <button
      type="button"
      class="blog-pager__step"
      :disabled="page === pageCount"
      @click="goToPage(page + 1)"
    >
      Older →
    </button>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { withBase } from 'vitepress';
import { data as posts } from '../../../blog/blog.data.mjs';

type ViewStyle = 'list' | 'cards';
const VIEW_STORAGE_KEY = 'ivue-blog-view';

// List is the default; the visitor's last choice persists per browser.
const viewStyle = ref<ViewStyle>('list');

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

  <div v-if="viewStyle === 'cards'" class="blog-list">
    <a v-for="post in posts" :key="post.slug" class="blog-card" :href="withBase(post.url)">
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
    <a v-for="post in posts" :key="post.slug" class="blog-row" :href="withBase(post.url)">
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
</template>

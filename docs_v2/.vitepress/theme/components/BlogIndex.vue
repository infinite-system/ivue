<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { onMounted } from 'vue';
import { withBase } from 'vitepress';
import { data as posts } from '../../../blog/blog.data.mjs';
import NewsletterQuickJoin from './NewsletterQuickJoin.vue';
import { rankPosts } from '../blog-search';

type ViewStyle = 'list' | 'cards';
const VIEW_STORAGE_KEY = 'ivue-blog-view';
const SEE_ALL_STORAGE_KEY = 'ivue-blog-see-all';

// List is the default; the visitor's last choice persists per browser.
const viewStyle = ref<ViewStyle>('list');

// Channel posts (private HN/X/… artifacts) exist only in dev-server
// data — production data never contains them, so the See-all toggle
// simply never renders there. Default view = exactly what production
// shows.
const seeAll = ref(false);
const privatePostCount = computed(
  () => posts.filter((post) => post.private).length,
);
const visiblePosts = computed(() =>
  seeAll.value ? posts : posts.filter((post) => !post.private),
);
const CHANNEL_LABELS: Record<string, string> = {
  hn: 'HN',
  reddit: 'REDDIT',
  x: '𝕏 THREAD',
  linkedin: 'LINKEDIN',
  note: 'NOTE',
};

function toggleSeeAll() {
  seeAll.value = !seeAll.value;
  localStorage.setItem(SEE_ALL_STORAGE_KEY, seeAll.value ? '1' : '');
}

// ---- search (the sidebar has its own, filtering the rail) ----------
const searchQuery = ref('');

// ---- tag filter ----------------------------------------------------
// Tags come from post frontmatter; the cloud shows each with its count.
const activeTag = ref<string | null>(null);

const tagCounts = computed(() => {
  const counts = new Map<string, number>();
  for (const post of visiblePosts.value) {
    for (const tag of post.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort(
    (first, second) => second[1] - first[1] || first[0].localeCompare(second[0]),
  );
});

// Search RANKS, not just filters (blog-search.ts — shared with the
// sidebar rail's search). Without a query, newest-first stands.
const filteredPosts = computed(() =>
  rankPosts(
    visiblePosts.value.filter(
      (post) => !activeTag.value || post.tags.includes(activeTag.value),
    ),
    searchQuery.value,
  ),
);

function toggleTag(tag: string) {
  activeTag.value = activeTag.value === tag ? null : tag;
}

// ---- per-row tags ---------------------------------------------------
// Quiet chips beside the date. A CHARACTER budget decides how many
// show (no layout measurement — deterministic and SSR-stable); the
// rest fold into a +N pill that tap-expands. One row expanded at a
// time; navigating or filtering collapses it.
// list rows run the content width; cards share a grid cell
const TAG_CHAR_BUDGET = { list: 34, cards: 20 } as const;
const expandedTagsSlug = ref<string | null>(null);

function visibleTags(post: { slug: string; tags: string[] }): string[] {
  if (expandedTagsSlug.value === post.slug) return post.tags;
  const budget = TAG_CHAR_BUDGET[viewStyle.value];
  const shown: string[] = [];
  let spent = 0;
  for (const tag of post.tags) {
    spent += tag.length + 2;
    if (shown.length > 0 && spent > budget) break;
    shown.push(tag);
  }
  return shown;
}

function hiddenTagCount(post: { slug: string; tags: string[] }): number {
  return post.tags.length - visibleTags(post).length;
}

// cards view expands into an ANCHORED OVERLAY (a floating chip panel
// on the +N pill) instead of inline — an inline reveal grows the card
// and shoves its grid neighbors. These fold WITHOUT the expansion
// override: the visible row never changes, only the panel appears.
function foldedTags(post: { slug: string; tags: string[] }): string[] {
  const budget = TAG_CHAR_BUDGET.cards;
  const shown: string[] = [];
  let spent = 0;
  for (const tag of post.tags) {
    spent += tag.length + 2;
    if (shown.length > 0 && spent > budget) break;
    shown.push(tag);
  }
  return shown;
}

function overlayTags(post: { slug: string; tags: string[] }): string[] {
  return post.tags.slice(foldedTags(post).length);
}

function toggleTagExpand(slug: string) {
  expandedTagsSlug.value = expandedTagsSlug.value === slug ? null : slug;
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
watch([activeTag, searchQuery], () => {
  page.value = 1;
  expandedTagsSlug.value = null;
});

function goToPage(target: number) {
  page.value = Math.min(Math.max(1, target), pageCount.value);
  document
    .querySelector('.blog-index-toolbar')
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

onMounted(() => {
  // clicking anywhere outside a tag group closes an open overlay
  document.addEventListener('click', (event) => {
    if (
      expandedTagsSlug.value &&
      !(event.target as Element | null)?.closest?.('.foot-tags')
    )
      expandedTagsSlug.value = null;
  });
  const stored = localStorage.getItem(VIEW_STORAGE_KEY);
  if (stored === 'cards' || stored === 'list') {
    viewStyle.value = stored;
  }
  if (privatePostCount.value > 0) {
    seeAll.value = localStorage.getItem(SEE_ALL_STORAGE_KEY) === '1';
  }
  // freshness is judged client-side after mount — no hydration mismatch
  nowSeconds.value = Math.floor(Date.now() / 1000);
  // in-article tag chips link here as /blog/?tag=x — arrive pre-filtered
  const params = new URLSearchParams(window.location.search);
  const requestedTag = params.get('tag');
  if (requestedTag && posts.some((post) => post.tags.includes(requestedTag))) {
    activeTag.value = requestedTag;
  }
  // /blog/?q=words — a shareable pre-filled search
  const requestedQuery = params.get('q');
  if (requestedQuery) searchQuery.value = requestedQuery;
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
      <span class="blog-count">{{ visiblePosts.length }} articles</span>
      <button
        v-if="privatePostCount"
        type="button"
        class="blog-see-all"
        :class="{ active: seeAll }"
        :aria-pressed="seeAll"
        @click="toggleSeeAll"
      >
        {{ seeAll ? 'Public view' : `See all +${privatePostCount}` }}
      </button>
    </div>
    <NewsletterQuickJoin />
  </div>

  <div class="blog-search">
    <div class="blog-search__field">
      <svg class="blog-search__icon" width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
        <circle cx="6.5" cy="6.5" r="4.6" stroke="currentColor" stroke-width="1.6" />
        <path d="m10.3 10.3 3.2 3.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
      </svg>
      <input
        v-model="searchQuery"
        type="search"
        class="blog-search__input"
        placeholder="Search articles…"
        aria-label="Search articles"
      />
      <button
        v-if="searchQuery"
        type="button"
        class="blog-search__clear"
        aria-label="Clear search"
        @click="searchQuery = ''"
      >
        ×
      </button>
    </div>
    <span v-if="searchQuery || activeTag" class="blog-search__count">
      {{ filteredPosts.length }} match{{ filteredPosts.length === 1 ? '' : 'es' }}
    </span>
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
        <span class="blog-view-toggle__label">List</span>
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
        <span class="blog-view-toggle__label">Cards</span>
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
      <div v-if="!post.image" class="thumb thumb--channel">
        {{ post.channel ? CHANNEL_LABELS[post.channel] : post.private ? 'PRIVATE' : '' }}
      </div>
      <img
        v-else
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
          <span v-if="post.private" class="channel-chip">{{ post.channel ? CHANNEL_LABELS[post.channel] : 'PRIVATE' }}</span>
          <span class="meta">
            <span class="date">{{ formatDate(post.date) }}</span>
            <span v-if="post.tags.length" class="foot-tags">
              <button
                v-for="tag in foldedTags(post)"
                :key="tag"
                type="button"
                class="foot-tag"
                :class="{ 'foot-tag--active': tag === activeTag }"
                @click.prevent.stop="toggleTag(tag)"
              >{{ tag }}</button>
              <button
                v-if="overlayTags(post).length"
                type="button"
                class="foot-tag foot-tag--more"
                :class="{ 'foot-tag--active': expandedTagsSlug === post.slug }"
                :aria-label="`Show ${overlayTags(post).length} more tags`"
                @click.prevent.stop="toggleTagExpand(post.slug)"
              >+{{ overlayTags(post).length }}</button>
              <!-- anchored overlay: the reveal floats on the pill, so the
                   card never grows and grid neighbors never jump -->
              <span
                v-if="expandedTagsSlug === post.slug && overlayTags(post).length"
                class="foot-tags__overlay"
              >
                <button
                  v-for="tag in overlayTags(post)"
                  :key="tag"
                  type="button"
                  class="foot-tag"
                  :class="{ 'foot-tag--active': tag === activeTag }"
                  @click.prevent.stop="toggleTag(tag)"
                >{{ tag }}</button>
              </span>
            </span>
          </span>
          <span class="go">Read the post →</span>
        </div>
      </div>
    </a>
  </div>

  <div v-else class="blog-rows">
    <a v-for="post in pagedPosts" :key="post.slug" class="blog-row" :href="withBase(post.url)">
      <div v-if="!post.image" class="thumb thumb--channel">
        {{ post.channel ? CHANNEL_LABELS[post.channel] : post.private ? 'PRIVATE' : '' }}
      </div>
      <img
        v-else
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
          <span v-if="post.private" class="channel-chip">{{ post.channel ? CHANNEL_LABELS[post.channel] : 'PRIVATE' }}</span>
          <span class="meta">
            <span class="date">{{ formatDate(post.date) }}</span>
            <span v-if="post.tags.length" class="foot-tags">
              <button
                v-for="tag in visibleTags(post)"
                :key="tag"
                type="button"
                class="foot-tag"
                :class="{ 'foot-tag--active': tag === activeTag }"
                @click.prevent.stop="toggleTag(tag)"
              >{{ tag }}</button>
              <button
                v-if="hiddenTagCount(post) > 0"
                type="button"
                class="foot-tag foot-tag--more"
                :aria-label="`Show ${hiddenTagCount(post)} more tags`"
                @click.prevent.stop="toggleTagExpand(post.slug)"
              >+{{ hiddenTagCount(post) }}</button>
              <button
                v-else-if="expandedTagsSlug === post.slug"
                type="button"
                class="foot-tag foot-tag--more"
                aria-label="Collapse tags"
                @click.prevent.stop="toggleTagExpand(post.slug)"
              >−</button>
            </span>
          </span>
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

  <NewsletterQuickJoin placement="blog-footer" align="center" />
</template>

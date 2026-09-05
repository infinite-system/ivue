<script setup lang="ts">
import NewsletterQuickJoin from './NewsletterQuickJoin.vue';
import { BlogIndex } from './BlogIndex';

const index = new BlogIndex.Class();

// the state destructure — every Ref the template touches, grouped
const {
  // state refs
  seeAll,
  searchQuery,
  activeTag,
} = index;
</script>

<template>
  <div class="blog-index-toolbar">
    <div class="blog-index-heading">
      <h1>Blog</h1>
      <span class="blog-count">{{ index.articleCountLabel }}</span>
      <button
        v-if="index.hasPrivatePosts"
        type="button"
        class="blog-see-all"
        :class="{ active: seeAll }"
        :aria-pressed="seeAll"
        @click="index.toggleSeeAll()"
      >
        {{ index.seeAllLabel }}
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
        @click="index.clearSearch()"
      >
        ×
      </button>
    </div>
    <span v-if="index.hasFilter" class="blog-search__count">
      {{ index.matchCountLabel }}
    </span>
    <div class="blog-view-toggle" role="group" aria-label="Display style">
      <button
        type="button"
        :class="{ active: index.isListView }"
        aria-label="List view"
        :aria-pressed="index.isListView"
        @click="index.showList()"
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
        :class="{ active: index.isCardsView }"
        aria-label="Card view"
        :aria-pressed="index.isCardsView"
        @click="index.showCards()"
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
      v-for="[tag, count] in index.tagCounts"
      :key="tag"
      type="button"
      class="blog-tag"
      :class="{ active: index.isActiveTag(tag) }"
      :aria-pressed="index.isActiveTag(tag)"
      @click="index.toggleTag(tag)"
    >
      {{ tag }}<span class="n">{{ count }}</span>
    </button>
    <button
      v-if="activeTag"
      type="button"
      class="blog-tag blog-tag--clear"
      @click="index.clearTag()"
    >
      clear ×
    </button>
  </div>

  <div v-if="index.isCardsView" class="blog-list">
    <a v-for="post in index.pagedPosts" :key="post.slug" class="blog-card" :href="index.postHref(post)">
      <div v-if="!post.image" class="thumb thumb--channel">
        {{ index.thumbLabel(post) }}
      </div>
      <img
        v-else
        class="thumb"
        :src="index.imageSrc(post)"
        :alt="post.title"
        width="1200"
        height="630"
        loading="lazy"
      />
      <span v-if="index.isNew(post)" class="new-badge new-badge--thumb">NEW</span>
      <div class="body">
        <h2>{{ post.title }}</h2>
        <p class="excerpt">{{ post.excerpt }}</p>
        <div class="foot">
          <span v-if="post.private" class="channel-chip">{{ index.chipLabel(post) }}</span>
          <span class="meta">
            <span class="date">{{ index.formatDate(post.date) }}</span>
            <span v-if="post.tags.length" class="foot-tags">
              <button
                v-for="tag in index.foldedTags(post)"
                :key="tag"
                type="button"
                class="foot-tag"
                :class="{ 'foot-tag--active': index.isActiveTag(tag) }"
                @click.prevent.stop="index.toggleTag(tag)"
              >{{ tag }}</button>
              <button
                v-if="index.hasOverlayTags(post)"
                type="button"
                class="foot-tag foot-tag--more"
                :class="{ 'foot-tag--active': index.isExpanded(post) }"
                :aria-label="index.overlayTagsLabel(post)"
                @click.prevent.stop="index.toggleTagExpand(post)"
              >+{{ index.overlayTags(post).length }}</button>
              <!-- anchored overlay: the reveal floats on the pill, so the
                   card never grows and grid neighbors never jump -->
              <span
                v-if="index.showsOverlay(post)"
                class="foot-tags__overlay"
              >
                <button
                  v-for="tag in index.overlayTags(post)"
                  :key="tag"
                  type="button"
                  class="foot-tag"
                  :class="{ 'foot-tag--active': index.isActiveTag(tag) }"
                  @click.prevent.stop="index.toggleTag(tag)"
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
    <a v-for="post in index.pagedPosts" :key="post.slug" class="blog-row" :href="index.postHref(post)">
      <div v-if="!post.image" class="thumb thumb--channel">
        {{ index.thumbLabel(post) }}
      </div>
      <img
        v-else
        class="thumb"
        :src="index.imageSrc(post)"
        :alt="post.title"
        width="1200"
        height="630"
        loading="lazy"
      />
      <span v-if="index.isNew(post)" class="new-badge new-badge--thumb">NEW</span>
      <div class="body">
        <h2>{{ post.title }}</h2>
        <p class="excerpt">{{ post.excerpt }}</p>
        <div class="foot">
          <span v-if="post.private" class="channel-chip">{{ index.chipLabel(post) }}</span>
          <span class="meta">
            <span class="date">{{ index.formatDate(post.date) }}</span>
            <span v-if="post.tags.length" class="foot-tags">
              <button
                v-for="tag in index.visibleTags(post)"
                :key="tag"
                type="button"
                class="foot-tag"
                :class="{ 'foot-tag--active': index.isActiveTag(tag) }"
                @click.prevent.stop="index.toggleTag(tag)"
              >{{ tag }}</button>
              <button
                v-if="index.hasHiddenTags(post)"
                type="button"
                class="foot-tag foot-tag--more"
                :aria-label="index.hiddenTagsLabel(post)"
                @click.prevent.stop="index.toggleTagExpand(post)"
              >+{{ index.hiddenTagCount(post) }}</button>
              <button
                v-else-if="index.isExpanded(post)"
                type="button"
                class="foot-tag foot-tag--more"
                aria-label="Collapse tags"
                @click.prevent.stop="index.toggleTagExpand(post)"
              >−</button>
            </span>
          </span>
          <span class="go">Read the post →</span>
        </div>
      </div>
    </a>
  </div>

  <nav v-if="index.hasPages" class="blog-pager" aria-label="Blog pages">
    <button
      type="button"
      class="blog-pager__step"
      :disabled="index.isFirstPage"
      @click="index.newerPage()"
    >
      ← Newer
    </button>
    <button
      v-for="pageNumber in index.pageCount"
      :key="pageNumber"
      type="button"
      class="blog-pager__page"
      :class="{ active: index.isCurrentPage(pageNumber) }"
      :aria-current="index.pageAriaCurrent(pageNumber)"
      @click="index.goToPage(pageNumber)"
    >
      {{ pageNumber }}
    </button>
    <button
      type="button"
      class="blog-pager__step"
      :disabled="index.isLastPage"
      @click="index.olderPage()"
    >
      Older →
    </button>
  </nav>

  <NewsletterQuickJoin placement="blog-footer" align="center" />
</template>


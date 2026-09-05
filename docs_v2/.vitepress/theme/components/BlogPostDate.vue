<script setup lang="ts">
import { BlogPostDate } from './BlogPostDate';

const postDate = new BlogPostDate.Class();
</script>

<template>
  <!-- the date moved to the doc footer (BlogPublishedDate) — the
       content is invariant-timeless, so the top of the post leads
       with tags only; the date stays findable at the bottom -->
  <p v-if="postDate.hasTags" class="blog-post-date">
    <span class="blog-post-tags">
      <svg
        class="blog-post-tags__icon"
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path
          d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"
        />
        <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
      </svg>
      <a
        v-for="tag in postDate.tags"
        :key="tag"
        class="blog-post-tag"
        :href="postDate.tagHref(tag)"
        >{{ tag }}</a
      >
    </span>
  </p>
</template>

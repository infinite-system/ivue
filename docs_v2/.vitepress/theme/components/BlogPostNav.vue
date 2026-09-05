<script setup lang="ts">
import { BlogPostNav } from './BlogPostNav';

const nav = new BlogPostNav.Class();
</script>

<template>
  <nav
    v-if="nav.hasNav"
    class="blog-post-nav"
    aria-label="More posts"
  >
    <a
      v-if="nav.olderPost"
      class="blog-post-nav__card"
      :href="nav.postHref(nav.olderPost)"
    >
      <img class="blog-post-nav__thumb" :src="nav.imageSrc(nav.olderPost)" :alt="nav.olderPost.title" loading="lazy" />
      <div class="blog-post-nav__body">
        <span class="blog-post-nav__title">{{ nav.olderPost.title }}</span>
        <span class="blog-post-nav__excerpt">{{ nav.olderPost.excerpt }}</span>
        <span class="blog-post-nav__label">← Older post</span>
      </div>
    </a>
    <span v-else class="blog-post-nav__spacer" aria-hidden="true"></span>
    <a
      v-if="nav.newerPost"
      class="blog-post-nav__card blog-post-nav__card--newer"
      :href="nav.postHref(nav.newerPost)"
    >
      <img class="blog-post-nav__thumb" :src="nav.imageSrc(nav.newerPost)" :alt="nav.newerPost.title" loading="lazy" />
      <div class="blog-post-nav__body">
        <span class="blog-post-nav__title">{{ nav.newerPost.title }}</span>
        <span class="blog-post-nav__excerpt">{{ nav.newerPost.excerpt }}</span>
        <span class="blog-post-nav__label">Newer post →</span>
      </div>
    </a>
  </nav>
</template>

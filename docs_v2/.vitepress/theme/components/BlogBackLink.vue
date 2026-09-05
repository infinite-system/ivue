<script setup lang="ts">
import { BlogBackLink } from './BlogBackLink';

const back = new BlogBackLink.Class();
</script>

<template>
  <!-- vp-raw: VitePress's router intercepts link clicks on window in the
       CAPTURE phase (before this handler) and skips .vp-raw — so the
       click is ours: one history step back when a previous page exists,
       else the blog index. Modifier clicks fall through to the native
       href, which points wherever back would lead. -->
  <a v-if="back.isBlogPost" class="blog-back vp-raw" :href="back.backHref" @click="back.goBack($event)">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m10.8 12 4.9-4.9-1.4-1.4L8 12l6.3 6.3 1.4-1.4-4.9-4.9Z"/></svg>
    {{ back.backLabel }}
  </a>
</template>

<script setup lang="ts">
import { BlogShare } from './BlogShare';

const props = defineProps(BlogShare.Class.props);

const share = new BlogShare.Class(props as BlogShare.Props);

// the state destructure
const {
  // state refs
  nativeShareAvailable,
  copied,
} = share;
</script>

<template>
  <div v-if="share.isBlogPost" class="blog-share" :class="share.placementClass">
    <span class="blog-share__label">Share</span>
    <div class="blog-share__buttons">
      <a
        v-for="target in share.targets"
        :key="target.name"
        class="blog-share__button blog-share__button--icon"
        :href="target.href"
        target="_blank"
        rel="noreferrer"
        :aria-label="share.shareLabel(target)"
        :title="share.shareLabel(target)"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" :d="target.icon" /></svg>
      </a>
      <button
        v-if="nativeShareAvailable"
        type="button"
        class="blog-share__button"
        aria-label="Share via your device"
        @click="share.nativeShare()"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18 16.1c-.76 0-1.44.3-1.96.77L8.9 12.7c.05-.23.1-.46.1-.7s-.05-.47-.1-.7l7.05-4.11A2.99 2.99 0 0 0 21 5a3 3 0 1 0-6 0c0 .24.04.47.1.7L8.04 9.81A2.99 2.99 0 0 0 3 12a3 3 0 0 0 5.04 2.19l7.12 4.16c-.06.21-.1.44-.1.67a2.94 2.94 0 1 0 2.94-2.92Z"/></svg>
        <span class="blog-share__name">Share…</span>
      </button>
      <button
        type="button"
        class="blog-share__button"
        :aria-label="share.copyAriaLabel"
        :title="share.copyLabel"
        @click="share.copyLink()"
      >
        <svg v-if="!copied" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1ZM8 13h8v-2H8v2Zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5Z"/></svg>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.55 17.05 4.9 12.4l1.4-1.4 3.25 3.24 8.15-8.15 1.4 1.42-9.55 9.54Z"/></svg>
        <span class="blog-share__name">{{ share.copyLabel }}</span>
      </button>
    </div>
  </div>
</template>

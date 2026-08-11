<script setup lang="ts">
import { computed, ref } from 'vue';
import { useData, useRoute } from 'vitepress';

const props = defineProps<{ placement: 'aside' | 'doc' }>();

const route = useRoute();
const { page } = useData();

// Only on blog articles — never the index, never guide pages.
const isBlogPost = computed(
  () => /^\/blog\/.+/.test(route.path) && !route.path.endsWith('/blog/'),
);

const shareUrl = computed(
  () => 'https://ivue.dev' + route.path.replace(/\.html$/, ''),
);
const shareTitle = computed(() => page.value.title);

const targets = computed(() => {
  const url = encodeURIComponent(shareUrl.value);
  const title = encodeURIComponent(shareTitle.value);
  return [
    {
      name: 'X',
      href: `https://x.com/intent/post?text=${title}&url=${url}`,
      icon: 'M18.9 2H22l-6.78 7.75L23.2 22h-6.25l-4.9-7.64L5.36 22H2.24l7.25-8.29L1.84 2h6.32l4.43 6.98L18.9 2Zm-1.1 18h1.73L7.22 3.9H5.36L17.8 20Z',
    },
    {
      name: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      icon: 'M20.45 3H3.55A.55.55 0 0 0 3 3.55v16.9c0 .3.25.55.55.55h16.9c.3 0 .55-.25.55-.55V3.55a.55.55 0 0 0-.55-.55ZM8.34 18.34H5.66V9.72h2.68v8.62ZM7 8.54a1.56 1.56 0 1 1 0-3.12 1.56 1.56 0 0 1 0 3.12Zm11.35 9.8h-2.67v-4.2c0-1 0-2.3-1.4-2.3-1.4 0-1.62 1.1-1.62 2.23v4.27H9.99V9.72h2.56v1.18h.04c.36-.67 1.22-1.38 2.5-1.38 2.68 0 3.18 1.77 3.18 4.06v4.76Z',
    },
    {
      name: 'Hacker News',
      href: `https://news.ycombinator.com/submitlink?u=${url}&t=${title}`,
      icon: 'M3 3h18v18H3V3Zm9.9 9.6 3.7-6.6h-1.8L12 10.9 9.2 6h-1.8l3.7 6.6V17h1.8v-4.4Z',
    },
    {
      name: 'Reddit',
      href: `https://www.reddit.com/submit?url=${url}&title=${title}`,
      icon: 'M22 12.1c0-1.2-1-2.2-2.2-2.2-.6 0-1.1.2-1.5.6a10.6 10.6 0 0 0-5.6-1.8l1-4.5 3.2.7a1.6 1.6 0 1 0 .2-1l-3.7-.8c-.3-.1-.5.1-.6.3l-1.1 5.2c-2.2.1-4.2.7-5.7 1.8-.4-.3-.9-.5-1.5-.5A2.2 2.2 0 0 0 3.4 14c0 .1 0 .3.1.4-.1.3-.1.6-.1.9 0 3.2 3.8 5.9 8.6 5.9s8.6-2.6 8.6-5.9l-.1-.9c.3-.3.5-.8.5-1.3Zm-14.2 1.6a1.6 1.6 0 1 1 3.2 0 1.6 1.6 0 0 1-3.2 0Zm8.9 4.2c-.8.8-2.3 1.2-4.4 1.2h-.4c-2.1 0-3.6-.4-4.4-1.2a.6.6 0 0 1 .8-.8c.6.6 1.9.9 3.8.9h.4c1.9 0 3.2-.3 3.8-.9a.6.6 0 0 1 .8 0c.2.2.2.6-.2.8Zm-.3-2.6a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2Z',
    },
  ];
});

const copied = ref(false);
async function copyLink() {
  await navigator.clipboard.writeText(shareUrl.value);
  copied.value = true;
  setTimeout(() => (copied.value = false), 1600);
}
</script>

<template>
  <div v-if="isBlogPost" class="blog-share" :class="`blog-share--${props.placement}`">
    <span class="blog-share__label">Share</span>
    <div class="blog-share__buttons">
      <a
        v-for="target in targets"
        :key="target.name"
        class="blog-share__button"
        :href="target.href"
        target="_blank"
        rel="noreferrer"
        :aria-label="`Share on ${target.name}`"
        :title="`Share on ${target.name}`"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" :d="target.icon" /></svg>
        <span class="blog-share__name">{{ target.name }}</span>
      </a>
      <button
        type="button"
        class="blog-share__button"
        :aria-label="copied ? 'Link copied' : 'Copy link'"
        :title="copied ? 'Copied!' : 'Copy link'"
        @click="copyLink"
      >
        <svg v-if="!copied" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10.6 13.4a1 1 0 0 1 0-1.4l2.8-2.8a3 3 0 0 1 4.2 4.2l-1.8 1.8a1 1 0 1 1-1.4-1.4l1.8-1.8a1 1 0 0 0-1.4-1.4L12 13.4a1 1 0 0 1-1.4 0Zm2.8-2.8a1 1 0 0 1 0 1.4l-2.8 2.8a3 3 0 0 1-4.2-4.2l1.8-1.8a1 1 0 0 1 1.4 1.4L7.8 12a1 1 0 0 0 1.4 1.4l2.8-2.8a1 1 0 0 1 1.4 0Z" transform="rotate(45 12 12)"/></svg>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.55 17.05 4.9 12.4l1.4-1.4 3.25 3.24 8.15-8.15 1.4 1.42-9.55 9.54Z"/></svg>
        <span class="blog-share__name">{{ copied ? 'Copied!' : 'Copy link' }}</span>
      </button>
    </div>
  </div>
</template>

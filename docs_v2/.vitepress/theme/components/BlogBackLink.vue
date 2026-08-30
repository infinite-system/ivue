<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter, withBase } from 'vitepress';
import { data as blogPosts } from '../../../blog/blog-lite.data.mjs';
import { data as pageRecords } from '../../../blog/pages-lite.data.mjs';

const route = useRoute();
const router = useRouter();
const isBlogPost = computed(
  () => /^\/blog\/.+/.test(route.path) && !route.path.endsWith('/blog/'),
);
const isBlogIndex = (path: string) => /^\/blog\/?(index\.html)?$/.test(path);

const blogBySlug = new Map(
  (blogPosts as any[]).map((post) => [post.slug, post]),
);

/** Title of an internal path — a blog post's own title, a docs page's
 *  frontmatter title, or null when unknown. Same mapping the link
 *  previews use. */
function titleFor(path: string): string | null {
  const clean = path.replace(/\.html$/, '');
  const blogPost = clean.match(/^\/blog\/([^/]+)$/);
  if (blogPost) return blogBySlug.get(blogPost[1])?.title ?? null;
  const record = (pageRecords as Record<string, any>)[
    clean.endsWith('/') ? clean.slice(0, -1) || clean : clean
  ];
  return record?.title ?? null;
}

// The previous in-session path, tracked so the link can NAME where back
// leads. One step only — the link always does history.go(-1) when a
// previous page exists (the old multi-step stack arithmetic mis-routed
// when its bookkeeping drifted), and falls back to a real /blog/ link on
// direct entry (a mail link, a shared URL).
const previousPath = ref<string | null>(null);
let currentPath = '';
let poppingHistory = false;
const onPopState = () => {
  poppingHistory = true;
};
onMounted(() => {
  currentPath = route.path;
  window.addEventListener('popstate', onPopState);
});
onUnmounted(() => window.removeEventListener('popstate', onPopState));
watch(
  () => route.path,
  (path) => {
    if (poppingHistory) {
      poppingHistory = false;
      // the browser's own back/forward — our one-step memory is no
      // longer trustworthy; the safe fallback is the plain index link
      previousPath.value = null;
    } else {
      previousPath.value = currentPath;
    }
    currentPath = path;
  },
);

const backLabel = computed(() => {
  const previous = previousPath.value;
  if (!previous || isBlogIndex(previous)) return 'Back to Blog';
  const title = titleFor(previous);
  return title ? `Back to ${title}` : 'Back';
});

/** With a previous page the href names IT (honest modifier-clicks /
 *  copy-link); on direct entry it is the blog index. */
const backHref = computed(() =>
  withBase(previousPath.value ?? '/blog/'),
);

function goBack(event: MouseEvent) {
  // modifier clicks (new tab) keep the plain link behavior
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  if (previousPath.value) {
    window.history.go(-1);
  } else {
    router.go(withBase('/blog/'));
  }
}
</script>

<template>
  <!-- vp-raw: VitePress's router intercepts link clicks on window in the
       CAPTURE phase (before this handler) and skips .vp-raw — so the
       click is ours: one history step back when a previous page exists,
       else the blog index. Modifier clicks fall through to the native
       href, which points wherever back would lead. -->
  <a v-if="isBlogPost" class="blog-back vp-raw" :href="backHref" @click="goBack">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m10.8 12 4.9-4.9-1.4-1.4L8 12l6.3 6.3 1.4-1.4-4.9-4.9Z"/></svg>
    {{ backLabel }}
  </a>
</template>

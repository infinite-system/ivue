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

// WHERE back leads is remembered in the HISTORY ENTRY ITSELF
// (history.state.backPath, stamped when the entry is pushed): the
// entry directly below any pushed entry is, by construction, the page
// it was pushed from — and unlike any component- or path-keyed memory,
// the stamp is per ENTRY, so it stays truthful when the same post
// appears twice in the stack (related links cycle) and survives any
// number of back/forward pops. Direct entries (a mail link, a shared
// URL) have no stamp and fall back to a plain /blog/ link.
//
// VitePress overwrites entry state with non-spreading replaceState
// calls ({ scrollPosition } on departure, {} on clean-URL
// normalization), which would destroy the stamp — so replaceState is
// wrapped ONCE to carry an existing backPath over unless the caller
// sets its own. A replace never changes which entry sits below, so
// carrying the stamp is always correct.
if (typeof window !== 'undefined' && !(history.replaceState as any).__ivueBackStamp) {
  const original = history.replaceState.bind(history);
  const wrapped = function (
    state: any,
    title: string,
    url?: string | URL | null,
  ) {
    const backPath = history.state?.backPath;
    if (
      backPath &&
      state &&
      typeof state === 'object' &&
      !('backPath' in state)
    ) {
      state = { ...state, backPath };
    }
    original(state, title, url);
  };
  (wrapped as any).__ivueBackStamp = true;
  history.replaceState = wrapped;
}

const previousPath = ref<string | null>(null);
let currentPath = '';
let poppingHistory = false;
const onPopState = () => {
  poppingHistory = true;
};
const readStamp = () => {
  previousPath.value =
    (window.history.state?.backPath as string | undefined) ?? null;
};
onMounted(() => {
  currentPath = route.path;
  window.addEventListener('popstate', onPopState);
  readStamp();
});
onUnmounted(() => window.removeEventListener('popstate', onPopState));
watch(
  () => route.path,
  (path) => {
    const cameFrom = currentPath;
    const popped = poppingHistory;
    poppingHistory = false;
    currentPath = path;
    if (!popped && !window.history.state?.backPath) {
      window.history.replaceState(
        { ...window.history.state, backPath: cameFrom },
        '',
      );
    }
    readStamp();
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

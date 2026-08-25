<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter, withBase } from 'vitepress';

const route = useRoute();
const router = useRouter();
const isBlogPost = computed(
  () => /^\/blog\/.+/.test(route.path) && !route.path.endsWith('/blog/'),
);
const isBlogIndex = (path: string) => /^\/blog\/?(index\.html)?$/.test(path);

// The in-session route stack, so "Back" can return to the index the
// reader actually came from (with its scroll position, filters, and
// view mode intact) instead of loading a fresh index. Pushes on
// navigation, pops on the browser's own back/forward (popstate).
const stack: string[] = [];
let poppingHistory = false;
const onPopState = () => {
  poppingHistory = true;
};
onMounted(() => {
  stack.push(route.path);
  window.addEventListener('popstate', onPopState);
});
onUnmounted(() => window.removeEventListener('popstate', onPopState));
watch(
  () => route.path,
  (path) => {
    if (poppingHistory) {
      poppingHistory = false;
      stack.pop();
      if (stack[stack.length - 1] !== path) stack.push(path);
    } else {
      stack.push(path);
    }
  },
);

function goBack(event: MouseEvent) {
  // modifier clicks (new tab) keep the plain link behavior
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  // the most recent index entry BEFORE the current page
  const indexPosition = stack.slice(0, -1).map(isBlogIndex).lastIndexOf(true);
  if (indexPosition === -1) {
    router.go(withBase('/blog/'));
    return;
  }
  window.history.go(indexPosition - (stack.length - 1));
}
</script>

<template>
  <!-- mobile-only escape hatch back to the index (CSS hides it wide).
       vp-raw: VitePress's router intercepts link clicks on window in the
       CAPTURE phase (before this handler) and skips .vp-raw — so the
       click is ours: history when the index is behind us, else the
       index itself. Modifier clicks fall through to the native href. -->
  <a v-if="isBlogPost" class="blog-back vp-raw" :href="withBase('/blog/')" @click="goBack">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m10.8 12 4.9-4.9-1.4-1.4L8 12l6.3 6.3 1.4-1.4-4.9-4.9Z"/></svg>
    Back to Blog
  </a>
</template>

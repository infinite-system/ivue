<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, withBase } from 'vitepress';

const experimentStorageKey = 'ivue.docs.experiment';
const isVisible = ref(false);
const route = useRoute();

function readExperimentFlag() {
  const queryValue = new URLSearchParams(window.location.search).get(
    'experiment',
  );

  if (queryValue === '1' || queryValue === '0') {
    sessionStorage.setItem(experimentStorageKey, queryValue);
  }

  isVisible.value =
    queryValue === '1' ||
    (queryValue !== '0' &&
      sessionStorage.getItem(experimentStorageKey) === '1');
}

onMounted(readExperimentFlag);

const links = [
  {
    text: 'Namespace Pattern',
    link: '/guide/namespace-pattern',
  },
  {
    text: 'Node Class HMR — Design',
    link: '/guide/node-class-hmr',
  },
];

function isActive(link: string) {
  return route.path === withBase(link);
}
</script>

<template>
  <section v-if="isVisible" class="experimental-docs">
    <h2>Current Explorations</h2>
    <a
      v-for="item in links"
      :key="item.link"
      :class="{ active: isActive(item.link) }"
      :href="`${withBase(item.link)}?experiment=1`"
      :aria-current="isActive(item.link) ? 'page' : undefined"
    >
      {{ item.text }}
    </a>
  </section>
</template>

<style scoped>
.experimental-docs {
  border-top: 1px solid var(--vp-c-divider);
  padding-top: 20px;
  padding-bottom: 24px;
}

.experimental-docs h2 {
  margin: 0;
  padding: 4px 0;
  color: var(--vp-c-text-1);
  font-size: 14px;
  font-weight: 700;
  line-height: 24px;
}

.experimental-docs a {
  display: block;
  padding: 4px 0;
  color: var(--vp-c-text-2);
  font-size: 14px;
  font-weight: 500;
  line-height: 24px;
  transition: color 0.25s;
}

.experimental-docs a:hover,
.experimental-docs a.active {
  color: var(--vp-c-brand-1);
}

@media (min-width: 960px) {
  .experimental-docs {
    width: calc(var(--vp-sidebar-width) - 64px);
  }
}
</style>

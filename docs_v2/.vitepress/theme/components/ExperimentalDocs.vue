<script setup lang="ts">
import { ExperimentalDocs } from './ExperimentalDocs';

const docs = new ExperimentalDocs.Class();

// the state destructure — every Ref the template touches, grouped
const {
  // state refs
  isVisible,
} = docs;
</script>

<template>
  <section v-if="isVisible" class="experimental-docs">
    <h2>Current Explorations</h2>
    <a
      v-for="item in docs.links"
      :key="item.link"
      :class="{ active: docs.isActive(item) }"
      :href="docs.href(item)"
      :aria-current="docs.ariaCurrent(item)"
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

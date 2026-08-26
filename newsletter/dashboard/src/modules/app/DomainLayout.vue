<script setup lang="ts">
import { RouterView } from 'vue-router';
import { AppStore, type DomainName } from './AppStore';

const props = defineProps<{ domain: DomainName }>();

const app = AppStore.use();
</script>

<template>
  <div class="domain">
    <nav class="subtabs" :aria-label="app.sectionsLabel(props.domain)">
      <button
        v-for="tab in app.TABS_BY_DOMAIN[props.domain]"
        :key="tab.name"
        class="tab"
        :class="{ active: app.isOpen(tab.name) }"
        :data-tab="tab.name"
        @click="app.open(tab.name)"
      >
        {{ tab.label }}
      </button>
    </nav>
    <RouterView />
  </div>
</template>

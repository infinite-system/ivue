<script setup lang="ts">
import type { Composer } from './Composer';

// The side panels as a menu — on a phone the rail folds into this, beside Send. Markup only,
// over the composer model.
defineProps<Composer.SectionProps>();
</script>

<template>
  <div v-if="model.isMenuOpen" class="ac-more-menu" role="menu">
    <button
      v-for="tab in model.tabs"
      :key="tab.id"
      type="button"
      class="ac-more-item"
      :class="{ 'ac-on': model.isActive(tab) }"
      role="menuitem"
      @click="model.pick(tab)"
    >
      <svg class="ac-btn-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path :d="model.iconOf(tab)" />
      </svg>
      <span>{{ tab.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { Sidebar } from './Sidebar';

const props = defineProps<Sidebar.Props>();

const model = new (
  (props.kit?.namespace.Class as typeof Sidebar.Class | undefined) ?? Sidebar.Class
)(props);
</script>

<template>
  <aside class="ac-side" :class="model.sideClass">
    <div v-if="model.isOpen" class="ac-side-panel" :style="model.panelStyle">
      <div
        class="ac-side-grip"
        title="Drag to resize"
        @pointerdown="model.onResizeStart($event)"
      ></div>
      <component :is="model.entry!.vue" :kit="model.entry" :chat="chat" />
    </div>
    <nav class="ac-rail" aria-label="Side panels">
      <button
        v-for="tab in model.tabs"
        :key="tab.id"
        type="button"
        class="ac-rail-btn"
        :class="{ 'ac-on': model.isActive(tab) }"
        :title="tab.hint"
        :aria-pressed="model.isActive(tab)"
        @click="model.select(tab)"
      >
        <svg class="ac-rail-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path :d="model.iconOf(tab)" />
        </svg>
        <span class="ac-rail-label">{{ tab.label }}</span>
      </button>
      <span class="ac-rail-spacer"></span>
      <button
        v-if="model.isOpen"
        type="button"
        class="ac-rail-btn ac-rail-collapse"
        title="Collapse"
        @click="model.close()"
      >
        <svg class="ac-rail-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path :d="model.collapseIcon" />
        </svg>
      </button>
    </nav>
  </aside>
</template>

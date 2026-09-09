<script setup lang="ts">
import type { ToolCallModel } from './ToolCallModel';

// The collapsed line every tool card shares — markup only; the model
// supplies every word and state.
defineProps<{ model: ToolCallModel.Instance }>();
</script>

<template>
  <button type="button" class="ac-tool-head" @click="model.toggle()">
    <span class="ac-tool-icon" aria-hidden="true">{{ model.icon }}</span>
    <span class="ac-tool-name">{{ model.name }}</span>
    <span class="ac-tool-summary">{{ model.summary }}</span>
    <span class="ac-tool-state" :class="model.stateClass">
      <span v-if="model.isRunning" class="ac-spinner" aria-hidden="true"></span>
      {{ model.elapsedLabel }}
    </span>
    <span class="ac-tool-toggle" aria-hidden="true">{{ model.toggleGlyph }}</span>
  </button>
</template>

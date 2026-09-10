<script setup lang="ts">
import type { ToolCallModel } from './ToolCallModel';

// The collapsed line every tool card shares: the arrow, the icon, the
// name, the action's title when it has one, then the argument — a file
// tool keeps its file name whole and truncates the directory instead.
// Markup only; the model supplies every word and state.
defineProps<{ model: ToolCallModel.Instance }>();
</script>

<template>
  <button type="button" class="ac-tool-head" @click="model.toggle()">
    <svg class="ac-tool-toggle ac-chevron" viewBox="0 0 24 24" aria-hidden="true"><path :d="model.chevronIcon" /></svg>
    <span class="ac-tool-icon" aria-hidden="true">{{ model.icon }}</span>
    <span class="ac-tool-name">{{ model.name }}</span>
    <span v-if="model.hasTitle" class="ac-tool-title">{{ model.title }}</span>
    <span v-if="model.isFileTool" class="ac-tool-path" :title="model.filePath">
      <span class="ac-tool-dir">{{ model.fileDirShort }}</span>
      <span class="ac-tool-file">{{ model.fileName }}</span>
    </span>
    <span v-else class="ac-tool-summary">{{ model.summary }}</span>
    <span class="ac-tool-state" :class="model.stateClass">
      <span v-if="model.isRunning" class="ac-spinner" aria-hidden="true"></span>
      {{ model.elapsedLabel }}
    </span>
  </button>
</template>

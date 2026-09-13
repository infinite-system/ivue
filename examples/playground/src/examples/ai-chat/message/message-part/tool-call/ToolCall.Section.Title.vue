<script setup lang="ts">
import type { ToolCallSection } from './ToolCall.Section';

// A section's title line: the title — a file path in its own face — and its tags. Markup only.
defineProps<ToolCallSection.SectionProps>();
</script>

<template>
  <h5>
    <span v-if="model.isPath" class="ac-path">{{ model.title }}</span>
    <template v-else>{{ model.title }}</template>
    <span v-for="tag in model.tags" :key="tag.text" class="ac-tag" :class="tag.class">{{
      tag.text
    }}</span>
  </h5>
</template>

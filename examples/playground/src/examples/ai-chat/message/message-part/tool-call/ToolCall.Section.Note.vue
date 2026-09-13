<script setup lang="ts">
import type { ToolCallSection } from './ToolCall.Section';

// What stands in for an empty block: a muted line. Markup only.
defineProps<ToolCallSection.SectionProps>();
</script>

<template>
  <p v-if="model.hasNote" class="ac-tool-caption ac-muted">{{ model.note }}</p>
</template>

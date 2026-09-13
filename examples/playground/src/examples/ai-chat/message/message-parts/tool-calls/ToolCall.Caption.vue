<script setup lang="ts">
import type { ToolCall } from './ToolCall';

// The line above an expanded card's blocks: the tool's caption when it has one. Markup only.
defineProps<ToolCall.SectionProps>();
</script>

<template>
  <p v-if="model.showsCaption" class="ac-tool-caption">{{ model.caption }}</p>
</template>

<script setup lang="ts">
import type { ToolCallSection } from './ToolCall.Section';

// An image a result carried — a screenshot read, a page a browser tool captured — in place of a
// block. Markup only.
defineProps<ToolCallSection.SectionProps>();
</script>

<template>
  <figure v-if="model.hasImage" class="ac-tool-image">
    <img :src="model.image" alt="" loading="lazy" />
  </figure>
</template>

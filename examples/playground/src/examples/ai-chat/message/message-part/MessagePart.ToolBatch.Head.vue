<script setup lang="ts">
import type { MessagePartToolBatch } from './MessagePart.ToolBatch';

// The batch's one row: the chevron, the count, the tools' names, the combined time with a
// failure mark. Markup only, over the batch model.
defineProps<MessagePartToolBatch.SectionProps>();
</script>

<template>
  <button type="button" class="ac-batch-head" @click="model.toggle()">
    <svg class="ac-batch-toggle ac-chevron" viewBox="0 0 24 24" aria-hidden="true">
      <path :d="model.chevronIcon" />
    </svg>
    <span class="ac-batch-count">{{ model.countLabel }}</span>
    <span class="ac-batch-names">{{ model.namesLabel }}</span>
    <span class="ac-batch-time" :class="model.timeClass">
      <span v-if="model.isRunning" class="ac-spinner" aria-hidden="true"></span>
      {{ model.timeLabel }}
    </span>
  </button>
</template>

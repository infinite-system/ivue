<script setup lang="ts">
import type { ToolCall } from './ToolCall';

// The expanded card's tail: the cap control, when a block is cut or was lifted — markup only.
defineProps<ToolCall.SectionProps>();
</script>

<template>
  <div v-if="model.showsTail" class="ac-tool-foot">
    <button type="button" class="ac-link" @click="model.toggleAll()">
      {{ model.showAllLabel }}
    </button>
  </div>
</template>

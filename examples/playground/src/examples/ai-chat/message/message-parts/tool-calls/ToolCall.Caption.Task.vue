<script setup lang="ts">
import type { Kit } from '../../../../../kit/Kit';
import type { ToolCallTask } from './ToolCall.Task';

// The Task card's caption — its own line above the blocks. Markup only, over the card model.
defineProps<{ kit: Kit.Entry; model: ToolCallTask.Instance }>();
</script>

<template>
  <p v-if="model.isExpanded" class="ac-tool-caption">
    <span class="ac-tag">{{ model.verb }}</span>
    <span class="ac-path">{{ model.subject }}</span>
    <span v-if="model.status" class="ac-tag">{{ model.status }}</span>
  </p>
</template>

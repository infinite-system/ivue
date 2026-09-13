<script setup lang="ts">
import type { Kit } from '../../../../../kit/Kit';
import type { ToolCallAgent } from './ToolCall.Agent';

// The Agent card's caption — its own line above the blocks. Markup only, over the card model.
defineProps<{ kit: Kit.Entry; model: ToolCallAgent.Instance }>();
</script>

<template>
  <p v-if="model.isExpanded" class="ac-tool-caption">
    <span class="ac-tag">{{ model.agentType }}</span>
    <span v-if="model.modelLabel" class="ac-tag">{{ model.modelLabel }}</span>
    {{ model.description }}
  </p>
</template>

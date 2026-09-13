<script setup lang="ts">
import type { Kit } from '../../../../../kit/Kit';
import type { ToolCallMcp } from './ToolCall.Mcp';

// The Mcp card's caption — its own line above the blocks. Markup only, over the card model.
defineProps<{ kit: Kit.Entry; model: ToolCallMcp.Instance }>();
</script>

<template>
  <p v-if="model.isExpanded" class="ac-tool-caption">
    <span class="ac-tag">{{ model.server }}</span>
    <span class="ac-path">{{ model.tool }}</span>
  </p>
</template>

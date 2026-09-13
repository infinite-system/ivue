<script setup lang="ts">
import type { Kit } from '../../../../../kit/Kit';
import type { ToolCallArtifact } from './ToolCall.Artifact';

// The Artifact card's caption — its own line above the blocks. Markup only, over the card model.
defineProps<{ kit: Kit.Entry; model: ToolCallArtifact.Instance }>();
</script>

<template>
  <p v-if="model.isExpanded" class="ac-tool-caption">
    <span class="ac-tag">{{ model.action }}</span>
    <span class="ac-path">{{ model.title }}</span>
    <span v-if="model.versionLabel" class="ac-tag">{{ model.versionLabel }}</span>
    <a v-if="model.resultUrl" :href="model.resultUrl" target="_blank" rel="noreferrer">open</a>
  </p>
</template>

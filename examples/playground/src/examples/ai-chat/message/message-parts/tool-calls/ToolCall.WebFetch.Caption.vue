<script setup lang="ts">
import type { Kit } from '../../../../../kit/Kit';
import type { ToolCallWebFetch } from './ToolCall.WebFetch';

// The WebFetch card's caption, role Caption of its own kit: its line above the blocks. Markup only.
defineProps<{ kit: Kit.Entry; model: ToolCallWebFetch.Instance }>();
</script>

<template>
  <p v-if="model.isExpanded" class="ac-tool-caption">
    <a v-if="model.url" class="ac-path" :href="model.url" target="_blank" rel="noreferrer">{{
      model.url
    }}</a>
    <span v-else class="ac-path">{{ model.query }}</span>
    <span v-if="model.statusLabel" class="ac-tag">{{ model.statusLabel }}</span>
  </p>
</template>

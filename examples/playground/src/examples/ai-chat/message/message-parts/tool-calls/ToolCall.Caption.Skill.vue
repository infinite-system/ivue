<script setup lang="ts">
import type { Kit } from '../../../../../kit/Kit';
import type { ToolCallSkill } from './ToolCall.Skill';

// The Skill card's caption — its own line above the blocks. Markup only, over the card model.
defineProps<{ kit: Kit.Entry; model: ToolCallSkill.Instance }>();
</script>

<template>
  <p v-if="model.isExpanded" class="ac-tool-caption">
    <span class="ac-tag">/{{ model.skill }}</span>
    <span class="ac-tag" :class="model.statusClass">{{ model.statusLabel }}</span>
  </p>
</template>

<script setup lang="ts">
import type { MessagePartSystem } from './MessagePart.System';

// The detail a system line folds — a compaction summary is markdown, rendered like any prose.
// Markup only.
defineProps<MessagePartSystem.SectionProps>();
</script>

<template>
  <div v-if="model.showsDetail" class="ac-system-detail ac-text" v-html="model.detailHtml"></div>
</template>

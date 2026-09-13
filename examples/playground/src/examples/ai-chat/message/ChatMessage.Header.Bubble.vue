<script setup lang="ts">
import type { ChatMessage } from './ChatMessage';

// A swapped head for the bubble tree: the name and the time on one quiet line.
defineProps<ChatMessage.SectionProps>();
</script>

<template>
  <header class="ac-msg-head ac-bubble-head">
    <span class="ac-msg-role">{{ model.speakerLabel }}</span>
    <span class="ac-msg-time">{{ model.timeLabel }}</span>
    <span v-if="model.hasDate" class="ac-msg-ago">{{ model.relativeLabel }}</span>
  </header>
</template>

<script setup lang="ts">
import type { Kit } from '../../../kit/Kit';
import type { ChatMessage } from '../ChatMessage';

// A swapped head for the bubble tree: the name and the time on one quiet line.
defineProps<{ kit: Kit.Entry; model: ChatMessage.Instance }>();
</script>

<template>
  <header class="ac-msg-head ac-bubble-head">
    <span class="ac-msg-role">{{ model.roleLabel }}</span>
    <span class="ac-msg-time">{{ model.timeLabel }}</span>
    <span v-if="model.hasDate" class="ac-msg-ago">{{ model.relativeLabel }}</span>
  </header>
</template>

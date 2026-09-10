<script setup lang="ts">
import type { Kit } from '../../../kit/Kit';
import type { ChatMessage } from '../ChatMessage';

// A swapped head for the minimal tree: the turn number and the time, nothing else.
defineProps<{ kit: Kit.Entry; model: ChatMessage.Instance }>();
</script>

<template>
  <header class="ac-msg-head ac-minimal-head">
    <span class="ac-msg-index">{{ model.indexLabel }}</span>
    <span class="ac-msg-time">{{ model.timeLabel }}</span>
  </header>
</template>

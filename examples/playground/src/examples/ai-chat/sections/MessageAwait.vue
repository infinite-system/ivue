<script setup lang="ts">
import type { Kit } from '../../../kit/Kit';
import type { ChatMessage } from '../ChatMessage';

// The line a reply shows while it waits for its first token. Markup only.
defineProps<{ kit: Kit.Entry; model: ChatMessage.Instance }>();
</script>

<template>
  <div class="ac-await">
    <span class="ac-spinner" aria-hidden="true"></span>
    <span>{{ model.awaitingLabel }}</span>
  </div>
</template>

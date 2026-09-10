<script setup lang="ts">
import type { Kit } from '../../../kit/Kit';
import type { ChatMessage } from '../ChatMessage';

// The row's gutter: the avatar letter. Markup only, over the row model.
defineProps<{ kit: Kit.Entry; model: ChatMessage.Instance }>();
</script>

<template>
  <div class="ac-msg-gutter">
    <span class="ac-msg-avatar" aria-hidden="true">{{ model.avatarLetter }}</span>
  </div>
</template>

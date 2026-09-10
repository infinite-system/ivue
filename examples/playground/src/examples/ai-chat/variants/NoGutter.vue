<script setup lang="ts">
import type { Kit } from '../../../kit/Kit';
import type { ChatMessage } from '../ChatMessage';

// A swapped gutter that renders nothing: the bubble tree carries the role in the bubble itself.
defineProps<{ kit: Kit.Entry; model: ChatMessage.Instance }>();
</script>

<template>
  <span class="ac-msg-gutter ac-gutter-none" aria-hidden="true"></span>
</template>

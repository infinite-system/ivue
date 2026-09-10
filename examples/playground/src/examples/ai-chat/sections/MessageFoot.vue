<script setup lang="ts">
import type { Kit } from '../../../kit/Kit';
import type { ChatMessage } from '../ChatMessage';

// The reply's receipt: tokens and wall time. Markup only.
defineProps<{ kit: Kit.Entry; model: ChatMessage.Instance }>();
</script>

<template>
  <footer class="ac-msg-foot">{{ model.receiptLabel }}</footer>
</template>

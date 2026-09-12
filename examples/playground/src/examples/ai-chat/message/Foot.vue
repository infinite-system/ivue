<script setup lang="ts">
import type { ChatMessage } from './ChatMessage';

// The reply's receipt: tokens and wall time. Markup only.
defineProps<ChatMessage.SectionProps>();
</script>

<template>
  <footer class="ac-msg-foot">{{ model.receiptLabel }}</footer>
</template>

<script setup lang="ts">
import type { Kit } from '../../../kit/Kit';
import type { ChatMessage } from '../ChatMessage';

// A swapped foot that renders nothing: the minimal tree drops the receipts.
defineProps<{ kit: Kit.Entry; model: ChatMessage.Instance }>();
</script>

<template>
  <span class="ac-foot-none" aria-hidden="true"></span>
</template>

<script setup lang="ts">
import { PartToolCall } from './PartToolCall';

const props = defineProps<PartToolCall.Props>();

const model = new (
  (props.kit?.namespace.Class as typeof PartToolCall.Class | undefined) ?? PartToolCall.Class
)(props);
</script>

<template>
  <component
    :is="model.card.view"
    :kit="model.card"
    :call="model.call"
    :chat="chat"
    :message="message"
  />
</template>

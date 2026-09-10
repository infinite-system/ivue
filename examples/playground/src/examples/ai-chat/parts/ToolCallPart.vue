<script setup lang="ts">
import { ToolCallPart } from './ToolCallPart';

const props = defineProps<ToolCallPart.Props>();

const model = new ((props.kit?.namespace.Class as typeof ToolCallPart.Class | undefined) ?? ToolCallPart.Class)(props);
</script>

<template>
  <component :is="model.card.vue" :kit="model.card" :call="model.call" :chat="chat" :message="message" />
</template>

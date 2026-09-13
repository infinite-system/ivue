<script setup lang="ts">
import { MessagePartToolCall } from './MessagePart.ToolCall';

const props = defineProps<MessagePartToolCall.Props>();

const model = new (
  (props.kit?.namespace.Class as typeof MessagePartToolCall.Class | undefined) ??
  MessagePartToolCall.Class
)(props);
</script>

<template>
  <component :is="model.viewOf(model.call)" v-bind="model.propsOf(model.call)" />
</template>

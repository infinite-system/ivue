<script setup lang="ts">
import { MessagePartToolBatchCalls } from './MessagePart.ToolBatch.Calls';

const props = defineProps<MessagePartToolBatchCalls.Props>();

const model = new (
  (props.kit?.namespace?.Class as typeof MessagePartToolBatchCalls.Class | undefined) ??
  MessagePartToolBatchCalls.Class
)(props);
</script>

<template>
  <div v-if="model.isExpanded" class="ac-batch-body">
    <component
      v-for="(call, at) in model.calls"
      :key="model.keyOf(call)"
      :is="model.viewOf(call)"
      v-bind="model.propsOf(call, at)"
    />
  </div>
</template>

<script setup lang="ts">
import { ToolCallSubThread } from './ToolCall.SubThread';

const props = defineProps<ToolCallSubThread.Props>();

const model = new (
  (props.kit?.namespace.Class as typeof ToolCallSubThread.Class | undefined) ??
  ToolCallSubThread.Class
)(props);
</script>

<template>
  <div class="ac-subthread">
    <p class="ac-subthread-head">{{ model.countLabel }}</p>
    <component
      :is="model.kit.Message.view"
      v-for="row in model.rows"
      :key="row.id"
      :kit="model.kit.Message"
      :row="row"
      :chat="chat"
    />
  </div>
</template>

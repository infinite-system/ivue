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
      v-for="(row, at) in model.rows"
      :key="model.keyOf(row)"
      :is="model.viewOf(row)"
      v-bind="model.propsOf(row, at)"
    />
  </div>
</template>

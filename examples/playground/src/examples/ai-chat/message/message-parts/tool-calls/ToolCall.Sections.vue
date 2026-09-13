<script setup lang="ts">
import { ToolCallSections } from './ToolCall.Sections';

const props = defineProps<ToolCallSections.Props>();

const model = new (
  (props.kit?.namespace?.Class as typeof ToolCallSections.Class | undefined) ??
  ToolCallSections.Class
)(props);
</script>

<template>
  <div v-if="model.isExpanded" class="ac-tool-sections">
    <component
      v-for="(section, at) in model.sections"
      :key="model.keyOf(section, at)"
      :is="model.viewOf(section)"
      v-bind="model.propsOf(section, at)"
    />
  </div>
</template>

<script setup lang="ts">
import { ToolCall } from './ToolCall';

const props = defineProps<ToolCall.Props>();

// the one `new`: the class the entry names — a tool's own — or the generic card
const model = new (
  (props.kit?.namespace?.Class as typeof ToolCall.Class | undefined) ?? ToolCall.Class
)(props);
</script>

<template>
  <div class="ac-tool" :class="model.cardClass">
    <template v-for="role in model.kit.order" :key="role">
      <component :is="model.kit[role].view" v-bind="model.seam(role)" />
    </template>
  </div>
</template>

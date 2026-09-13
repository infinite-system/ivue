<script setup lang="ts">
import { ToolCallSection } from './ToolCall.Section';

const props = defineProps<ToolCallSection.Props>();

const model = new (
  (props.kit?.namespace?.Class as typeof ToolCallSection.Class | undefined) ?? ToolCallSection.Class
)(props);
</script>

<template>
  <section class="ac-tool-section">
    <template v-for="role in model.kit.order" :key="role">
      <component :is="model.kit[role].view" v-bind="model.seam(role)" />
    </template>
  </section>
</template>

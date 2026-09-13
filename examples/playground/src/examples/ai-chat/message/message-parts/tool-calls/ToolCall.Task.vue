<script setup lang="ts">
import { ToolCallTask } from './ToolCall.Task';
import type { ToolCall } from './ToolCall';

const props = defineProps<ToolCall.Props>();

const model = new (
  (props.kit?.namespace?.Class as typeof ToolCallTask.Class | undefined) ?? ToolCallTask.Class
)(props);
</script>

<template>
  <div class="ac-tool ac-tool-task" :class="model.cardClass">
    <component :is="model.kit.Header.view" :model="model" />
    <div v-if="model.isExpanded" class="ac-tool-body">
      <p class="ac-tool-caption">
        <span class="ac-tag">{{ model.verb }}</span>
        <span class="ac-path">{{ model.subject }}</span>
        <span v-if="model.status" class="ac-tag">{{ model.status }}</span>
      </p>
      <section v-for="section in model.sections" :key="section.title" class="ac-tool-section">
        <h5>{{ section.title }}</h5>
        <component
          :is="model.kit.CodeBlock.view"
          :kit="model.kit.CodeBlock"
          :code="section.code"
          :lang="section.lang"
          :cap="model.cap"
          :tone="section.tone"
          wrap
        />
      </section>
      <component :is="model.kit.Footer.view" :model="model" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ToolCall } from './ToolCall';

// Any tool the kit does not name: input as JSON, result as text.
const props = defineProps<ToolCall.Props>();

const model = new (
  (props.kit?.namespace.Class as typeof ToolCall.Class | undefined) ?? ToolCall.Class
)(props);
</script>

<template>
  <div class="ac-tool ac-tool-generic" :class="model.cardClass">
    <component :is="model.kit.Header.view" :model="model" />
    <div v-if="model.isExpanded" class="ac-tool-body">
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

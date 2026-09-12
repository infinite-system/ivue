<script setup lang="ts">
import { ToolCallMcp } from './ToolCall.Mcp';
import type { ToolCall } from './ToolCall';

const props = defineProps<ToolCall.Props>();

const model = new (
  (props.kit?.namespace.Class as typeof ToolCallMcp.Class | undefined) ?? ToolCallMcp.Class
)(props);
</script>

<template>
  <div class="ac-tool ac-tool-mcp" :class="model.cardClass">
    <component :is="model.kit.Header.view" :model="model" />
    <div v-if="model.isExpanded" class="ac-tool-body">
      <p class="ac-tool-caption">
        <span class="ac-tag">{{ model.server }}</span>
        <span class="ac-path">{{ model.tool }}</span>
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

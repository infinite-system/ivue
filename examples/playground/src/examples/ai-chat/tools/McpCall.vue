<script setup lang="ts">
import { McpCall } from './McpCall';
import type { ToolCallModel } from './ToolCallModel';

const props = defineProps<ToolCallModel.Props>();

const model = new (
  (props.kit?.namespace.Class as typeof McpCall.Class | undefined) ?? McpCall.Class
)(props);
</script>

<template>
  <div class="ac-tool ac-tool-mcp" :class="model.cardClass">
    <component :is="model.kit.Head.view" :model="model" />
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
      <component :is="model.kit.Foot.view" :model="model" />
    </div>
  </div>
</template>

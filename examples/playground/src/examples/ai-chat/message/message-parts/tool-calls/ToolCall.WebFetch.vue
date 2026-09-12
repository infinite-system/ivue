<script setup lang="ts">
import { ToolCallWebFetch } from './ToolCall.WebFetch';
import type { ToolCall } from './ToolCall';

const props = defineProps<ToolCall.Props>();

const model = new (
  (props.kit?.namespace.Class as typeof ToolCallWebFetch.Class | undefined) ??
  ToolCallWebFetch.Class
)(props);
</script>

<template>
  <div class="ac-tool ac-tool-web" :class="model.cardClass">
    <component :is="model.kit.Header.view" :model="model" />
    <div v-if="model.isExpanded" class="ac-tool-body">
      <p class="ac-tool-caption">
        <a v-if="model.url" class="ac-path" :href="model.url" target="_blank" rel="noreferrer">{{
          model.url
        }}</a>
        <span v-else class="ac-path">{{ model.query }}</span>
        <span v-if="model.statusLabel" class="ac-tag">{{ model.statusLabel }}</span>
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

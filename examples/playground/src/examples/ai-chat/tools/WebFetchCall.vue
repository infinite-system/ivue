<script setup lang="ts">
import { WebFetchCall } from './WebFetchCall';
import type { ToolCallModel } from './ToolCallModel';
import ToolHead from './ToolHead.vue';
import ToolFoot from './ToolFoot.vue';
import CodeBlock from './CodeBlock.vue';

const props = defineProps<ToolCallModel.Props>();

const model = new WebFetchCall.Class(props);
</script>

<template>
  <div class="ac-tool ac-tool-web" :class="model.cardClass">
    <ToolHead :model="model" />
    <div v-if="model.isExpanded" class="ac-tool-body">
      <p class="ac-tool-caption">
        <a v-if="model.url" class="ac-path" :href="model.url" target="_blank" rel="noreferrer">{{ model.url }}</a>
        <span v-else class="ac-path">{{ model.query }}</span>
        <span v-if="model.statusLabel" class="ac-tag">{{ model.statusLabel }}</span>
      </p>
      <section v-for="section in model.sections" :key="section.title" class="ac-tool-section">
        <h5>{{ section.title }}</h5>
        <CodeBlock :code="section.code" :lang="section.lang" :cap="model.cap" :tone="section.tone" wrap />
      </section>
      <ToolFoot :model="model" />
    </div>
  </div>
</template>

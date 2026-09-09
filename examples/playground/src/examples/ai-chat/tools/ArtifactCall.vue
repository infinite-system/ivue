<script setup lang="ts">
import { ArtifactCall } from './ArtifactCall';
import type { ToolCallModel } from './ToolCallModel';
import ToolHead from './ToolHead.vue';
import ToolFoot from './ToolFoot.vue';
import CodeBlock from './CodeBlock.vue';

const props = defineProps<ToolCallModel.Props>();

const model = new ArtifactCall.Class(props);
</script>

<template>
  <div class="ac-tool ac-tool-artifact" :class="model.cardClass">
    <ToolHead :model="model" />
    <div v-if="model.isExpanded" class="ac-tool-body">
      <p class="ac-tool-caption">
        <span class="ac-tag">{{ model.action }}</span>
        <span class="ac-path">{{ model.title }}</span>
        <span v-if="model.versionLabel" class="ac-tag">{{ model.versionLabel }}</span>
        <a v-if="model.resultUrl" :href="model.resultUrl" target="_blank" rel="noreferrer">open</a>
      </p>
      <section v-for="section in model.sections" :key="section.title" class="ac-tool-section">
        <h5>{{ section.title }}</h5>
        <CodeBlock :code="section.code" :lang="section.lang" :cap="model.cap" :tone="section.tone" wrap />
      </section>
      <ToolFoot :model="model" />
    </div>
  </div>
</template>

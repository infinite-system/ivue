<script setup lang="ts">
import { ArtifactCall } from './ArtifactCall';
import type { ToolCallModel } from './ToolCallModel';

const props = defineProps<ToolCallModel.Props>();

const model = new ((props.kit?.namespace.Class as typeof ArtifactCall.Class | undefined) ?? ArtifactCall.Class)(props);
</script>

<template>
  <div class="ac-tool ac-tool-artifact" :class="model.cardClass">
    <component :is="model.kit.Head.vue" :model="model" />
    <div v-if="model.isExpanded" class="ac-tool-body">
      <p class="ac-tool-caption">
        <span class="ac-tag">{{ model.action }}</span>
        <span class="ac-path">{{ model.title }}</span>
        <span v-if="model.versionLabel" class="ac-tag">{{ model.versionLabel }}</span>
        <a v-if="model.resultUrl" :href="model.resultUrl" target="_blank" rel="noreferrer">open</a>
      </p>
      <section v-for="section in model.sections" :key="section.title" class="ac-tool-section">
        <h5>{{ section.title }}</h5>
        <component :is="model.kit.CodeBlock.vue" :kit="model.kit.CodeBlock" :code="section.code" :lang="section.lang" :cap="model.cap" :tone="section.tone" wrap />
      </section>
      <component :is="model.kit.Foot.vue" :model="model" />
    </div>
  </div>
</template>

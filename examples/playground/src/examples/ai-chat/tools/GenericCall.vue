<script setup lang="ts">
import { ToolCallModel } from './ToolCallModel';
import ToolHead from './ToolHead.vue';
import ToolFoot from './ToolFoot.vue';
import CodeBlock from './CodeBlock.vue';

// Any tool the registry does not name: input as JSON, result as text.
const props = defineProps<ToolCallModel.Props>();

const model = new ToolCallModel.Class(props);
</script>

<template>
  <div class="ac-tool ac-tool-generic" :class="model.cardClass">
    <ToolHead :model="model" />
    <div v-if="model.isExpanded" class="ac-tool-body">
      <section v-for="section in model.sections" :key="section.title" class="ac-tool-section">
        <h5>{{ section.title }}</h5>
        <CodeBlock :code="section.code" :lang="section.lang" :cap="model.cap" :tone="section.tone" wrap />
      </section>
      <ToolFoot :model="model" />
    </div>
  </div>
</template>

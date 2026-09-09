<script setup lang="ts">
import { SkillCall } from './SkillCall';
import type { ToolCallModel } from './ToolCallModel';
import ToolHead from './ToolHead.vue';
import ToolFoot from './ToolFoot.vue';
import CodeBlock from './CodeBlock.vue';

const props = defineProps<ToolCallModel.Props>();

const model = new SkillCall.Class(props);
</script>

<template>
  <div class="ac-tool ac-tool-skill" :class="model.cardClass">
    <ToolHead :model="model" />
    <div v-if="model.isExpanded" class="ac-tool-body">
      <p class="ac-tool-caption">
        <span class="ac-tag">/{{ model.skill }}</span>
        <span class="ac-tag" :class="model.statusClass">{{ model.statusLabel }}</span>
      </p>
      <section v-for="section in model.sections" :key="section.title" class="ac-tool-section">
        <h5>{{ section.title }}</h5>
        <CodeBlock :code="section.code" :lang="section.lang" :cap="model.cap" :tone="section.tone" wrap />
      </section>
      <ToolFoot :model="model" />
    </div>
  </div>
</template>

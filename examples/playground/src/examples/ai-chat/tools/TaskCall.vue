<script setup lang="ts">
import { TaskCall } from './TaskCall';
import type { ToolCallModel } from './ToolCallModel';

const props = defineProps<ToolCallModel.Props>();

const model = new (
  (props.kit?.namespace.Class as typeof TaskCall.Class | undefined) ?? TaskCall.Class
)(props);
</script>

<template>
  <div class="ac-tool ac-tool-task" :class="model.cardClass">
    <component :is="model.kit.Head.vue" :model="model" />
    <div v-if="model.isExpanded" class="ac-tool-body">
      <p class="ac-tool-caption">
        <span class="ac-tag">{{ model.verb }}</span>
        <span class="ac-path">{{ model.subject }}</span>
        <span v-if="model.status" class="ac-tag">{{ model.status }}</span>
      </p>
      <section v-for="section in model.sections" :key="section.title" class="ac-tool-section">
        <h5>{{ section.title }}</h5>
        <component
          :is="model.kit.CodeBlock.vue"
          :kit="model.kit.CodeBlock"
          :code="section.code"
          :lang="section.lang"
          :cap="model.cap"
          :tone="section.tone"
          wrap
        />
      </section>
      <component :is="model.kit.Foot.vue" :model="model" />
    </div>
  </div>
</template>

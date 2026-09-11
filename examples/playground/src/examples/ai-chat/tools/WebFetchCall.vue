<script setup lang="ts">
import { WebFetchCall } from './WebFetchCall';
import type { ToolCallModel } from './ToolCallModel';

const props = defineProps<ToolCallModel.Props>();

const model = new (
  (props.kit?.namespace.Class as typeof WebFetchCall.Class | undefined) ?? WebFetchCall.Class
)(props);
</script>

<template>
  <div class="ac-tool ac-tool-web" :class="model.cardClass">
    <component :is="model.kit.Head.view" :model="model" />
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
      <component :is="model.kit.Foot.view" :model="model" />
    </div>
  </div>
</template>

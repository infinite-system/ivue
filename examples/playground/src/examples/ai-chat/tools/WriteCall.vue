<script setup lang="ts">
import { WriteCall } from './WriteCall';
import type { ToolCallModel } from './ToolCallModel';
import ToolHead from './ToolHead.vue';
import ToolFoot from './ToolFoot.vue';
import CodeBlock from './CodeBlock.vue';

const props = defineProps<ToolCallModel.Props>();

const model = new WriteCall.Class(props);
</script>

<template>
  <div class="ac-tool ac-tool-write" :class="model.cardClass">
    <ToolHead :model="model" />
    <div v-if="model.isExpanded" class="ac-tool-body">
      <section class="ac-tool-section">
        <h5>
          <span class="ac-path">{{ model.filePath }}</span>
          <span class="ac-tag">{{ model.lineCountLabel }}</span>
          <span v-if="model.wasOverwrite" class="ac-tag">overwrote</span>
        </h5>
        <CodeBlock :code="model.content" :lang="model.language" :cap="model.cap" :start-line="1" />
      </section>
      <section v-if="model.showsError" class="ac-tool-section">
        <h5>error</h5>
        <CodeBlock :code="model.resultText" lang="text" :cap="model.cap" tone="error" wrap />
      </section>
      <ToolFoot :model="model" />
    </div>
  </div>
</template>

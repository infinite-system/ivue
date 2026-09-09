<script setup lang="ts">
import { ReadCall } from './ReadCall';
import type { ToolCallModel } from './ToolCallModel';
import ToolHead from './ToolHead.vue';
import ToolFoot from './ToolFoot.vue';
import CodeBlock from './CodeBlock.vue';

const props = defineProps<ToolCallModel.Props>();

const model = new ReadCall.Class(props);
</script>

<template>
  <div class="ac-tool ac-tool-read" :class="model.cardClass">
    <ToolHead :model="model" />
    <div v-if="model.isExpanded" class="ac-tool-body">
      <section class="ac-tool-section">
        <h5>
          <span class="ac-path">{{ model.filePath }}</span>
          <span class="ac-tag">{{ model.rangeLabel }}</span>
          <span v-if="model.lineCountLabel" class="ac-tag">{{ model.lineCountLabel }}</span>
        </h5>
        <CodeBlock v-if="model.showsCode" :code="model.code" :lang="model.language" :cap="model.cap" :start-line="model.startLine" />
        <p v-else-if="model.showsEmpty" class="ac-tool-caption ac-muted">{{ model.emptyLabel }}</p>
      </section>
      <ToolFoot :model="model" />
    </div>
  </div>
</template>

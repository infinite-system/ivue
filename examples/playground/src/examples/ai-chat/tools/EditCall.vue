<script setup lang="ts">
import { EditCall } from './EditCall';
import type { ToolCallModel } from './ToolCallModel';
import ToolHead from './ToolHead.vue';
import ToolFoot from './ToolFoot.vue';
import CodeBlock from './CodeBlock.vue';

const props = defineProps<ToolCallModel.Props>();

const model = new EditCall.Class(props);
</script>

<template>
  <div class="ac-tool ac-tool-edit" :class="model.cardClass">
    <ToolHead :model="model" />
    <div v-if="model.isExpanded" class="ac-tool-body">
      <section class="ac-tool-section">
        <h5>
          <span class="ac-path">{{ model.filePath }}</span>
          <span class="ac-tag">{{ model.changeLabel }}</span>
          <span v-if="model.replacesAll" class="ac-tag">replace all</span>
        </h5>
        <CodeBlock :code="model.diff" lang="diff" :cap="model.cap" />
      </section>
      <section v-if="model.showsError" class="ac-tool-section">
        <h5>error</h5>
        <CodeBlock :code="model.resultText" lang="text" :cap="model.cap" tone="error" wrap />
      </section>
      <ToolFoot :model="model" />
    </div>
  </div>
</template>

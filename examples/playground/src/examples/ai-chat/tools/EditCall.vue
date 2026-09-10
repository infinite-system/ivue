<script setup lang="ts">
import { EditCall } from './EditCall';
import type { ToolCallModel } from './ToolCallModel';

const props = defineProps<ToolCallModel.Props>();

const model = new ((props.kit?.namespace.Class as typeof EditCall.Class | undefined) ?? EditCall.Class)(props);
</script>

<template>
  <div class="ac-tool ac-tool-edit" :class="model.cardClass">
    <component :is="model.kit.Head.vue" :model="model" />
    <div v-if="model.isExpanded" class="ac-tool-body">
      <section class="ac-tool-section">
        <h5>
          <span class="ac-path">{{ model.filePath }}</span>
          <span class="ac-tag">{{ model.changeLabel }}</span>
          <span v-if="model.replacesAll" class="ac-tag">replace all</span>
        </h5>
        <component :is="model.kit.CodeBlock.vue" :kit="model.kit.CodeBlock" :code="model.diff" lang="diff" :cap="model.cap" />
      </section>
      <section v-if="model.showsError" class="ac-tool-section">
        <h5>error</h5>
        <component :is="model.kit.CodeBlock.vue" :kit="model.kit.CodeBlock" :code="model.resultText" lang="text" :cap="model.cap" tone="error" wrap />
      </section>
      <component :is="model.kit.Foot.vue" :model="model" />
    </div>
  </div>
</template>

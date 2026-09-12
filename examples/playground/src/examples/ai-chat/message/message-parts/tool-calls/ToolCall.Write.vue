<script setup lang="ts">
import { ToolCallWrite } from './ToolCall.Write';
import type { ToolCall } from './ToolCall';

const props = defineProps<ToolCall.Props>();

const model = new (
  (props.kit?.namespace.Class as typeof ToolCallWrite.Class | undefined) ?? ToolCallWrite.Class
)(props);
</script>

<template>
  <div class="ac-tool ac-tool-write" :class="model.cardClass">
    <component :is="model.kit.Header.view" :model="model" />
    <div v-if="model.isExpanded" class="ac-tool-body">
      <section class="ac-tool-section">
        <h5>
          <span class="ac-path">{{ model.filePath }}</span>
          <span class="ac-tag">{{ model.lineCountLabel }}</span>
          <span v-if="model.wasOverwrite" class="ac-tag">overwrote</span>
        </h5>
        <component
          :is="model.kit.CodeBlock.view"
          :kit="model.kit.CodeBlock"
          :code="model.content"
          :lang="model.language"
          :cap="model.cap"
          :start-line="1"
        />
      </section>
      <section v-if="model.showsError" class="ac-tool-section">
        <h5>error</h5>
        <component
          :is="model.kit.CodeBlock.view"
          :kit="model.kit.CodeBlock"
          :code="model.resultText"
          lang="text"
          :cap="model.cap"
          tone="error"
          wrap
        />
      </section>
      <component :is="model.kit.Footer.view" :model="model" />
    </div>
  </div>
</template>

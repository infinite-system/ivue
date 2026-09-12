<script setup lang="ts">
import { ToolCallCodeBlock } from './ToolCall.CodeBlock';

const props = defineProps<ToolCallCodeBlock.Props>();

const model = new (
  (props.kit?.namespace.Class as typeof ToolCallCodeBlock.Class | undefined) ??
  ToolCallCodeBlock.Class
)(props);
</script>

<template>
  <div class="ac-code-host">
    <div
      class="ac-code"
      :class="model.blockClass"
      :style="model.blockStyle"
      v-html="model.renderedHtml"
    ></div>
    <button
      type="button"
      class="ac-code-copy"
      :class="model.copyClass"
      :title="model.copyLabel"
      @click="model.copy()"
    >
      <svg class="ac-code-copy-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path :d="model.copyIcon" />
      </svg>
      <span class="ac-code-copy-text">{{ model.copyLabel }}</span>
    </button>
  </div>
</template>

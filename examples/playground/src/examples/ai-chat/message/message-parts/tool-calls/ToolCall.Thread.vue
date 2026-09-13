<script setup lang="ts">
import type { ToolCall } from './ToolCall';

// The thread a call carried — a subagent's run — folded behind its count; opened, the rows render
// through the SubThread role's own seam. Markup and one seam only.
defineProps<ToolCall.SectionProps>();
</script>

<template>
  <div v-if="model.showsThread" class="ac-tool-thread">
    <button type="button" class="ac-link" @click="model.toggleThread()">
      {{ model.threadLabel }}
    </button>
    <component
      v-if="model.isThreadOpen"
      :is="model.kit.SubThread.view"
      v-bind="model.seam('SubThread')"
    />
  </div>
</template>

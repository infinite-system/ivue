<script setup lang="ts">
import type { ChatMessage } from './ChatMessage';

// The list section: every part of the message through its own seam — the
// entry the row's kit names for the part's kind, fed the part as the
// seam's item and the loop's key. Markup only.
defineProps<ChatMessage.SectionProps>();
</script>

<template>
  <div class="ac-parts">
    <component
      v-for="(part, at) in model.parts"
      :key="model.keyOf(part, at)"
      :is="model.viewOf(part)"
      v-bind="model.propsOf(part, at)"
    />
  </div>
</template>

<script setup lang="ts">
import type { MessagePartSystem } from './MessagePart.System';

// The thread a system line's children form, shown while the line is open — the rows render
// through the SubThread role's own seam. Markup and one seam only.
defineProps<MessagePartSystem.SectionProps>();
</script>

<template>
  <component
    v-if="model.showsThread"
    :is="model.kit.SubThread.view"
    v-bind="model.seam('SubThread')"
  />
</template>

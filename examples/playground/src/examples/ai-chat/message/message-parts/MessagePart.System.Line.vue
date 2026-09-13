<script setup lang="ts">
import type { MessagePartSystem } from './MessagePart.System';

// The system line itself: an icon, the text, and the fold toggle when there is something to fold.
// Markup only, over the line model.
defineProps<MessagePartSystem.SectionProps>();
</script>

<template>
  <button type="button" class="ac-system-line" :disabled="!model.hasDetail" @click="model.toggle()">
    <span class="ac-system-icon" aria-hidden="true">{{ model.icon }}</span>
    <span class="ac-system-text">{{ model.part.text }}</span>
    <span v-if="model.hasDetail" class="ac-system-toggle">{{ model.toggleLabel }}</span>
  </button>
</template>

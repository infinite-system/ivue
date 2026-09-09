<script setup lang="ts">
import type { SessionLog } from '../SessionLog';
import type { Parts } from './Parts';
import { ThinkingPart } from './ThinkingPart';

const props = defineProps<Parts.Props<SessionLog.ThinkingPart>>();

const model = new ThinkingPart.Class(props);
</script>

<template>
  <div class="ac-thinking" :class="{ 'ac-live': model.isLive, 'ac-open': model.isExpanded }">
    <button type="button" class="ac-thinking-head" @click="model.toggle()">
      <span v-if="model.isLive" class="ac-spinner ac-spinner-soft" aria-hidden="true"></span>
      <span v-else class="ac-thinking-dot" aria-hidden="true"></span>
      <span class="ac-thinking-label">{{ model.headLabel }}</span>
      <span class="ac-thinking-toggle">{{ model.toggleLabel }}</span>
    </button>
    <pre v-if="model.isExpanded" class="ac-thinking-text">{{ model.part.text }}</pre>
  </div>
</template>

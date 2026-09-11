<script setup lang="ts">
import type { SessionLog } from '../SessionLog';
import type { Part } from './Part';
import { ThinkingPart } from './ThinkingPart';

const props = defineProps<Part.Props<SessionLog.ThinkingPart>>();

const model = new (
  (props.kit?.namespace.Class as typeof ThinkingPart.Class | undefined) ?? ThinkingPart.Class
)(props);
</script>

<template>
  <div class="ac-thinking" :class="{ 'ac-live': model.isLive, 'ac-open': model.isExpanded }">
    <button type="button" class="ac-thinking-head" @click="model.toggle()">
      <span v-if="model.isLive" class="ac-spinner ac-spinner-soft" aria-hidden="true"></span>
      <span v-else class="ac-thinking-dot" aria-hidden="true"></span>
      <span class="ac-thinking-label">{{ model.headLabel }}</span>
    </button>
    <pre v-if="model.isExpanded" class="ac-thinking-text">{{ model.text }}</pre>
  </div>
</template>

<script setup lang="ts">
import type { SessionLog } from '../SessionLog';
import type { Parts } from './Parts';
import { TextPart } from './TextPart';

const props = defineProps<Parts.Props<SessionLog.TextPart>>();

const model = new TextPart.Class(props);
const {
  // element refs
  element,
} = model;
</script>

<template>
  <div ref="element" class="ac-text" :class="{ 'ac-text-streaming': model.isStreamingTail }" v-html="model.html"></div>
</template>

<script setup lang="ts">
import type { SessionLog } from '../SessionLog';
import type { Part } from './Part';
import { TextPart } from './TextPart';

const props = defineProps<Part.Props<SessionLog.TextPart>>();

const model = new (
  (props.kit?.namespace.Class as typeof TextPart.Class | undefined) ?? TextPart.Class
)(props);
const {
  // element refs
  element
} = model;
</script>

<template>
  <div
    ref="element"
    class="ac-text"
    :class="{ 'ac-text-streaming': model.isStreamingTail }"
    v-html="model.html"
  ></div>
</template>

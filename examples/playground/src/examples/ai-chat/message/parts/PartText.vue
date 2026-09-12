<script setup lang="ts">
import type { SessionLog } from '../../SessionLog';
import type { Part } from './Part';
import { PartText } from './PartText';

const props = defineProps<Part.Props<SessionLog.PartText>>();

const model = new (
  (props.kit?.namespace.Class as typeof PartText.Class | undefined) ?? PartText.Class
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

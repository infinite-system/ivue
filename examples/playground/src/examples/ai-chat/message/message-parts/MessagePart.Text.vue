<script setup lang="ts">
import type { SessionLog } from '../../SessionLog';
import type { MessagePart } from './MessagePart';
import { MessagePartText } from './MessagePart.Text';

const props = defineProps<MessagePart.Props<SessionLog.TextPart>>();

const model = new (
  (props.kit?.namespace.Class as typeof MessagePartText.Class | undefined) ?? MessagePartText.Class
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

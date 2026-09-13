<script setup lang="ts">
import type { SessionLog } from '../../SessionLog';
import type { MessagePart } from './MessagePart';
import { MessagePartToolBatch } from './MessagePart.ToolBatch';

const props = defineProps<MessagePart.Props<SessionLog.ToolBatchPart>>();

const model = new (
  (props.kit?.namespace?.Class as typeof MessagePartToolBatch.Class | undefined) ??
  MessagePartToolBatch.Class
)(props);
</script>

<template>
  <div class="ac-batch" :class="model.batchClass">
    <template v-for="role in model.kit.order" :key="role">
      <component :is="model.kit[role].view" v-bind="model.seam(role)" />
    </template>
  </div>
</template>

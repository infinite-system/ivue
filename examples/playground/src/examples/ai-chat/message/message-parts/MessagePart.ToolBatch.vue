<script setup lang="ts">
import type { SessionLog } from '../../SessionLog';
import type { MessagePart } from './MessagePart';
import { MessagePartToolBatch } from './MessagePart.ToolBatch';

const props = defineProps<MessagePart.Props<SessionLog.ToolBatchPart>>();

const model = new (
  (props.kit?.namespace.Class as typeof MessagePartToolBatch.Class | undefined) ??
  MessagePartToolBatch.Class
)(props);
</script>

<template>
  <div class="ac-batch" :class="model.batchClass">
    <button type="button" class="ac-batch-head" @click="model.toggle()">
      <svg class="ac-batch-toggle ac-chevron" viewBox="0 0 24 24" aria-hidden="true">
        <path :d="model.chevronIcon" />
      </svg>
      <span class="ac-batch-count">{{ model.countLabel }}</span>
      <span class="ac-batch-names">{{ model.namesLabel }}</span>
      <span class="ac-batch-time" :class="{ 'ac-state-failed': model.hasFailure }">
        <span v-if="model.isRunning" class="ac-spinner" aria-hidden="true"></span>
        {{ model.timeLabel }}
      </span>
    </button>
    <div v-if="model.isExpanded" class="ac-batch-body">
      <component
        v-for="(call, at) in model.calls"
        :key="model.keyOf(call)"
        :is="model.viewOf(call)"
        v-bind="model.propsOf(call, at)"
      />
    </div>
  </div>
</template>

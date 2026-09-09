<script setup lang="ts">
import type { SessionLog } from '../SessionLog';
import type { Parts } from './Parts';
import { ToolBatchPart } from './ToolBatchPart';
import { Tools } from '../tools/Tools';

const props = defineProps<Parts.Props<SessionLog.ToolBatchPart>>();

const model = new ToolBatchPart.Class(props);
</script>

<template>
  <div class="ac-batch" :class="model.batchClass">
    <button type="button" class="ac-batch-head" @click="model.toggle()">
      <span class="ac-batch-count">{{ model.countLabel }}</span>
      <span class="ac-batch-icons" aria-hidden="true">
        <span v-for="entry in model.icons" :key="entry.key" class="ac-batch-icon" :title="entry.name">{{ entry.icon }}</span>
      </span>
      <span class="ac-batch-names">{{ model.namesLabel }}</span>
      <span class="ac-batch-time" :class="{ 'ac-state-failed': model.hasFailure }">
        <span v-if="model.isRunning" class="ac-spinner" aria-hidden="true"></span>
        {{ model.timeLabel }}
      </span>
      <span class="ac-batch-toggle" aria-hidden="true">{{ model.toggleLabel }}</span>
    </button>
    <div v-if="model.isExpanded" class="ac-batch-body">
      <component :is="Tools.Class.componentFor(call.name)" v-for="call in model.calls" :key="call.id" :call="call" :chat="chat" :message="message" />
    </div>
  </div>
</template>

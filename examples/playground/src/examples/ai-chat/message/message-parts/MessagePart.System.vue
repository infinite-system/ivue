<script setup lang="ts">
import type { SessionLog } from '../../SessionLog';
import type { MessagePart } from './MessagePart';
import { MessagePartSystem } from './MessagePart.System';

const props = defineProps<MessagePart.Props<SessionLog.SystemPart>>();

const model = new (
  (props.kit?.namespace?.Class as typeof MessagePartSystem.Class | undefined) ??
  MessagePartSystem.Class
)(props);
</script>

<template>
  <div class="ac-system" :class="model.subtypeClass">
    <button
      type="button"
      class="ac-system-line"
      :disabled="!model.hasDetail"
      @click="model.toggle()"
    >
      <span class="ac-system-icon" aria-hidden="true">{{ model.icon }}</span>
      <span class="ac-system-text">{{ model.part.text }}</span>
      <span v-if="model.hasDetail" class="ac-system-toggle">{{ model.toggleLabel }}</span>
    </button>
    <div v-if="model.showsDetail" class="ac-system-detail ac-text" v-html="model.detailHtml"></div>
    <component
      v-if="model.showsThread"
      :is="model.kit.SubThread.view"
      v-bind="model.seam('SubThread')"
    />
  </div>
</template>

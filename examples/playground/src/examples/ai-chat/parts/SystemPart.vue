<script setup lang="ts">
import type { SessionLog } from '../SessionLog';
import type { Part } from './Part';
import { SystemPart } from './SystemPart';

const props = defineProps<Part.Props<SessionLog.SystemPart>>();

const model = new (
  (props.kit?.namespace.Class as typeof SystemPart.Class | undefined) ?? SystemPart.Class
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
      :is="model.kit.SubThread.vue"
      :kit="model.kit.SubThread"
      :messages="model.children"
      :chat="chat"
    />
  </div>
</template>

<script setup lang="ts">
import type { SessionLog } from '../SessionLog';
import type { Parts } from './Parts';
import { SystemPart } from './SystemPart';
import SubThread from '../tools/SubThread.vue';

const props = defineProps<Parts.Props<SessionLog.SystemPart>>();

const model = new SystemPart.Class(props);
</script>

<template>
  <div class="ac-system" :class="model.subtypeClass">
    <button type="button" class="ac-system-line" :disabled="!model.hasDetail" @click="model.toggle()">
      <span class="ac-system-icon" aria-hidden="true">{{ model.icon }}</span>
      <span class="ac-system-text">{{ model.part.text }}</span>
      <span v-if="model.hasDetail" class="ac-system-toggle">{{ model.toggleLabel }}</span>
    </button>
    <pre v-if="model.showsDetail" class="ac-system-detail">{{ model.part.detail }}</pre>
    <SubThread v-if="model.showsThread" :messages="model.children" :chat="chat" />
  </div>
</template>

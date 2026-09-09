<script setup lang="ts">
import { ChatMessage } from './ChatMessage';
import { Parts } from './parts/Parts';

const props = defineProps<ChatMessage.Props>();

const model = new ChatMessage.Class(props);
</script>

<template>
  <article class="ac-msg" :class="model.rowClass">
    <div class="ac-msg-gutter">
      <span class="ac-msg-avatar" aria-hidden="true">{{ model.roleLabel.slice(0, 1) }}</span>
    </div>
    <div class="ac-msg-body">
      <header class="ac-msg-head">
        <strong class="ac-msg-role">{{ model.roleLabel }}</strong>
        <span v-if="model.modelLabel" class="ac-msg-model">{{ model.modelLabel }}</span>
        <span v-if="model.replayLabel" class="ac-msg-replay">{{ model.replayLabel }}</span>
        <span class="ac-msg-time">{{ model.timeLabel }}</span>
        <span class="ac-msg-index">{{ model.indexLabel }}</span>
      </header>

      <div v-if="model.isStub" class="ac-stub" :style="model.stubStyle">
        <span class="ac-stub-text">{{ model.stubLabel }}</span>
        <span class="ac-stub-status" :class="{ 'ac-live': model.isPageLoading }">
          <span v-if="model.isPageLoading" class="ac-spinner" aria-hidden="true"></span>
          {{ model.stubStatusLabel }}
        </span>
      </div>

      <div v-else class="ac-parts">
        <component
          :is="Parts.Class.componentFor(part.kind)"
          v-for="(part, at) in model.parts"
          :key="model.partKey(part, at)"
          :part="part"
          :chat="chat"
          :message="model.message"
        />
        <div v-if="model.isAwaitingFirstToken" class="ac-await">
          <span class="ac-spinner" aria-hidden="true"></span>
          <span>{{ model.awaitingLabel }}</span>
        </div>
      </div>

      <footer v-if="model.receiptLabel" class="ac-msg-foot">{{ model.receiptLabel }}</footer>
    </div>
  </article>
</template>

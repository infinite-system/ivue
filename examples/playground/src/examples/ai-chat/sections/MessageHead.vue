<script setup lang="ts">
import type { Kit } from '../../../kit/Kit';
import type { ChatMessage } from '../ChatMessage';

// The row's head: who, which model, when. Markup only, over the row model.
defineProps<{ kit: Kit.Entry; model: ChatMessage.Instance }>();
</script>

<template>
  <header class="ac-msg-head">
    <strong class="ac-msg-role">{{ model.roleLabel }}</strong>
    <span v-if="model.modelLabel" class="ac-msg-model">{{ model.modelLabel }}</span>
    <span v-if="model.replayLabel" class="ac-msg-replay">{{ model.replayLabel }}</span>
    <span class="ac-msg-time">{{ model.timeLabel }}</span>
    <span v-if="model.hasDate" class="ac-msg-date">{{ model.dateLabel }}</span>
    <span v-if="model.hasDate" class="ac-msg-ago">{{ model.relativeLabel }}</span>
    <span class="ac-msg-index">{{ model.indexLabel }}</span>
  </header>
</template>

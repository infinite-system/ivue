<script setup lang="ts">
import { SubThread } from './SubThread';
import ChatMessage from '../ChatMessage.vue';

const props = defineProps<SubThread.Props>();

const model = new SubThread.Class(props);
</script>

<template>
  <div class="ac-subthread">
    <p class="ac-subthread-head">{{ model.countLabel }}</p>
    <ChatMessage v-for="row in model.rows" :key="row.id" :row="row" :chat="chat" />
  </div>
</template>

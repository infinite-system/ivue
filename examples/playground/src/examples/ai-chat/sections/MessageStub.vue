<script setup lang="ts">
import type { Kit } from '../../../kit/Kit';
import type { ChatMessage } from '../ChatMessage';

// The row before its page lands: a skeleton at the scroller's estimated
// size, so a landing moves nothing, with the page's loader. Markup only.
defineProps<{ kit: Kit.Entry; model: ChatMessage.Instance }>();
</script>

<template>
  <div class="ac-stub" :style="model.stubStyle" :title="model.stubLabel">
    <span v-for="width in model.skeletonLines" :key="width" class="ac-skel" :style="{ width }"></span>
    <span class="ac-stub-status" :class="{ 'ac-live': model.isPageLoading }">
      <span v-if="model.isPageLoading" class="ac-spinner" aria-hidden="true"></span>
      {{ model.stubStatusLabel }}
    </span>
  </div>
</template>

<script setup lang="ts">
import type { Kit } from '../../../kit/Kit';
import type { ChatMessage } from '../ChatMessage';

// The row before its page lands: a skeleton at the scroller's estimated
// size, so a landing moves nothing, with the page's loader. Markup only.
defineProps<{ kit: Kit.Entry; model: ChatMessage.Instance }>();
</script>

<template>
  <div class="ac-stub" :style="model.stubStyle" :title="model.stubLabel">
    <span v-for="(block, at) in model.skeletonBlocks" :key="at" class="ac-skel" :class="model.skeletonClass(block)" :style="{ width: block.width }"></span>
    <span class="ac-stub-status" :class="{ 'ac-live': model.isPageLoading }">
      <span v-if="model.isPageLoading" class="ac-spinner" aria-hidden="true"></span>
      {{ model.stubStatusLabel }}
    </span>
  </div>
</template>

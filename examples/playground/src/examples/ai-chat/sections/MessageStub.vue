<script setup lang="ts">
import type { Kit } from '../../../kit/Kit';
import type { ChatMessage } from '../ChatMessage';

// The row before its page lands: the preview and the page's loader, at
// the scroller's estimated size so a landing moves nothing. Markup only.
defineProps<{ kit: Kit.Entry; model: ChatMessage.Instance }>();
</script>

<template>
  <div class="ac-stub" :style="model.stubStyle">
    <span class="ac-stub-text">{{ model.stubLabel }}</span>
    <span class="ac-stub-status" :class="{ 'ac-live': model.isPageLoading }">
      <span v-if="model.isPageLoading" class="ac-spinner" aria-hidden="true"></span>
      {{ model.stubStatusLabel }}
    </span>
  </div>
</template>

<script setup lang="ts">
import type { ExpressionModel } from './ExpressionModel';

defineProps<{ model: ExpressionModel.Instance }>();
</script>

<template>
  <div class="li-post">
    <div class="li-head">
      <div class="li-avatar" aria-hidden="true">{{ model.xName.slice(0, 1) }}</div>
      <div>
        <strong>{{ model.xName }}</strong>
        <p class="muted li-headline">Author of ivue · plain classes, full reactivity, one kilobyte</p>
        <p class="muted li-when">Now · 🌐</p>
      </div>
    </div>
    <p
      class="li-text"
      :contenteditable="model.editableAttribute"
      spellcheck="true"
      @input="model.onBodyInput($event)"
      @paste="model.onPaste($event)"
      @blur="model.saveBody()"
      v-text="model.record.body"
    ></p>
    <p v-if="model.afterLinkedinFold" class="li-fold" aria-hidden="true">…more — the feed folds about here</p>
    <div class="li-reactions" aria-hidden="true">
      <span>👍 ❤️ 💡</span>
      <span class="muted">Like · Comment · Repost · Send</span>
    </div>
    <div class="x-foot">
      <span class="x-count" :class="{ over: model.bodyOver }">{{ model.countLabel }}</span>
    </div>
  </div>
</template>

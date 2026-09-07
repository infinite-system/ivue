<script setup lang="ts">
import type { ExpressionModel } from './ExpressionModel';

defineProps<{ model: ExpressionModel.Instance }>();
</script>

<template>
  <ol class="xc-cards" aria-label="Image cards">
    <li v-for="entry in model.numbered" :key="entry.child.id" class="xc-card" :class="model.segmentTone(entry.child)">
      <span class="xc-index">{{ entry.number === null ? 'skipped' : entry.number }}</span>
      <p
        class="xc-text"
        :contenteditable="model.canEdit ? 'plaintext-only' : 'false'"
        spellcheck="true"
        @input="model.onSegmentInput(entry.child, $event)"
        @paste="model.onPaste($event)"
        @blur="model.saveSegment(entry.child)"
        v-text="entry.child.body"
      ></p>
      <span class="xc-brand">∞ ivue</span>
      <div class="x-foot xc-foot">
        <span class="x-count" :class="{ over: model.segmentOver(entry.child) }">{{ model.segmentCountLabel(entry.child) }}</span>
        <button class="ghost x-action" type="button" @click="model.copySegment(entry.child)">{{ model.copyLabel(model.segmentKey(entry.child)) }}</button>
        <button class="ghost x-action" type="button" @click="model.setSkipped(entry.child, !entry.child.skipped)">{{ model.skipLabel(entry.child) }}</button>
      </div>
    </li>
  </ol>
  <p class="muted press-hint">Each card renders at 1200×675 through the banner pipeline; the PNG export lands with the image-article step.</p>
</template>

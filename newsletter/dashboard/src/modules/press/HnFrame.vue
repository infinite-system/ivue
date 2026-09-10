<script setup lang="ts">
import type { ExpressionModel } from './ExpressionModel';
import MarkdownEditor from './MarkdownEditor.vue';

defineProps<{ model: ExpressionModel.Instance }>();
</script>

<template>
  <div class="hn-post">
    <div class="hn-bar"><strong>Y</strong> Hacker News <span class="muted">new | past | comments | ask | show | jobs | submit</span></div>
    <div class="hn-item">
      <span class="hn-rank">1. ▲</span>
      <div class="hn-main">
        <input
          class="hn-title"
          :value="model.bodyDraft.value"
          :readonly="!model.canEdit"
          aria-label="Submission title"
          placeholder="Show HN: …"
          @input="model.onBodyInput($event)"
          @blur="model.saveBody()"
        />
        <p class="muted hn-sub">
          <span class="x-count" :class="{ over: model.bodyOver }">{{ model.countLabel }}</span>
          · {{ model.pieceLinkLabel }} · 1 point by {{ model.xName.toLowerCase() }} just now
        </p>
      </div>
    </div>
    <div class="hn-comment">
      <p class="muted">{{ model.xName.toLowerCase() }} just now — the first comment (posted immediately)</p>
      <MarkdownEditor
        v-if="model.canEdit"
        :model-value="model.firstComment"
        placeholder="The first comment: history in three sentences, the misdiagnosis, what had to be true, the receipts, two weaknesses, the link."
        min-height="12rem"
        @update:model-value="model.onFirstCommentChange($event)"
        @save="model.saveBody()"
      />
      <div class="hn-rendered press-rendered" v-html="model.renderedFirstComment"></div>
    </div>
  </div>
</template>

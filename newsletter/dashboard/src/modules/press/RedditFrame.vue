<script setup lang="ts">
import type { ExpressionModel } from './ExpressionModel';

defineProps<{ model: ExpressionModel.Instance }>();
</script>

<template>
  <div class="rd-post">
    <div class="rd-votes" aria-hidden="true">
      <span>▲</span>
      <strong>·</strong>
      <span>▼</span>
    </div>
    <div class="rd-body">
      <p class="rd-sub"><strong>{{ model.subreddit }}</strong> <span class="muted">· Posted by u/{{ model.xName.toLowerCase() }} · now</span></p>
      <input
        class="rd-title"
        :value="model.title"
        :readonly="!model.canEdit"
        aria-label="Post title"
        placeholder="Title"
        @input="model.onMetaInput('title', $event)"
      />
      <div class="press-split">
        <textarea
          v-if="model.canEdit"
          class="press-md-editor"
          :value="model.bodyDraft.value"
          spellcheck="true"
          aria-label="Markdown"
          @input="model.onBodyInput($event)"
          @blur="model.saveBody()"
        ></textarea>
        <div class="rd-rendered press-rendered" v-html="model.renderedBody"></div>
      </div>
      <p class="muted rd-actions" aria-hidden="true">💬 Comments · Share · Save</p>
    </div>
  </div>
</template>

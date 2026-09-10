<script setup lang="ts">
import type { ExpressionModel } from './ExpressionModel';
import MarkdownEditor from './MarkdownEditor.vue';

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
        <MarkdownEditor
          v-if="model.canEdit"
          :model-value="model.bodyDraft.value"
          placeholder="Write the body. Drop images or video anywhere; paste a YouTube link for a player."
          min-height="22rem"
          @update:model-value="model.onBodyChange($event)"
          @save="model.saveBody()"
        />
        <div class="rd-rendered press-rendered" v-html="model.renderedBody"></div>
      </div>
      <p class="muted rd-actions" aria-hidden="true">💬 Comments · Share · Save</p>
    </div>
  </div>
</template>

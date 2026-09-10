<script setup lang="ts">
import type { ExpressionModel } from './ExpressionModel';
import MarkdownEditor from './MarkdownEditor.vue';

defineProps<{ model: ExpressionModel.Instance }>();
</script>

<template>
  <div class="ar-post" :class="model.articleTone">
    <label class="press-field press-cover-field">
      <span>Cover</span>
      <input :value="model.cover" :readonly="!model.canEdit" aria-label="Cover image" placeholder="/blog/slug.png" @input="model.onMetaInput('cover', $event)" />
    </label>
    <img v-if="model.cover" class="ar-cover" :src="model.coverUrl" alt="" />
    <input class="ar-title" :value="model.title" :readonly="!model.canEdit" aria-label="Title" placeholder="Title" @input="model.onMetaInput('title', $event)" />
    <p class="muted ar-byline">{{ model.xName }} · {{ model.platformLabel }}</p>
    <div class="press-split">
      <MarkdownEditor
        v-if="model.canEdit"
        :model-value="model.bodyDraft.value"
        placeholder="Write the body. Drop images or video anywhere; paste a YouTube link for a player."
        min-height="22rem"
        @update:model-value="model.onBodyChange($event)"
        @save="model.saveBody()"
      />
      <div class="ar-rendered press-rendered" v-html="model.renderedBody"></div>
    </div>
  </div>
</template>

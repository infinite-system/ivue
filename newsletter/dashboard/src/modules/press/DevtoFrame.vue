<script setup lang="ts">
import type { ExpressionModel } from './ExpressionModel';

defineProps<{ model: ExpressionModel.Instance }>();
</script>

<template>
  <div class="dv-post">
    <img v-if="model.cover" class="dv-cover" :src="model.coverUrl" alt="" />
    <div class="dv-fields">
      <input class="dv-title" :value="model.title" :readonly="!model.canEdit" aria-label="Title" placeholder="Title" @input="model.onMetaInput('title', $event)" />
      <input class="dv-tags" :value="model.tags" :readonly="!model.canEdit" aria-label="Tags" placeholder="#vue #typescript #javascript" @input="model.onMetaInput('tags', $event)" />
      <input class="dv-canonical" :value="model.canonical" :readonly="!model.canEdit" aria-label="Canonical URL" placeholder="Canonical URL" @input="model.onMetaInput('canonical', $event)" />
    </div>
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
      <div class="dv-rendered press-rendered" v-html="model.renderedBody"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ExpressionModel } from './ExpressionModel';
import MarkdownEditor from './MarkdownEditor.vue';

defineProps<{ model: ExpressionModel.Instance }>();
</script>

<template>
  <div class="pl-note">
    <MarkdownEditor
      v-if="model.canEdit"
      :model-value="model.bodyDraft.value"
      placeholder="The text."
      min-height="10rem"
      @update:model-value="model.onBodyChange($event)"
      @save="model.saveBody()"
    />
    <pre v-else class="press-plain">{{ model.record.body }}</pre>
    <div class="x-foot">
      <span class="x-count">{{ model.countLabel }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ExpressionModel } from './ExpressionModel';

defineProps<{ model: ExpressionModel.Instance }>();
</script>

<template>
  <div class="pl-note">
    <textarea
      v-if="model.canEdit"
      class="press-md-editor pl-editor"
      :value="model.bodyDraft.value"
      spellcheck="true"
      aria-label="Text"
      @input="model.onBodyInput($event)"
      @blur="model.saveBody()"
    ></textarea>
    <pre v-else class="press-plain">{{ model.record.body }}</pre>
    <div class="x-foot">
      <span class="x-count">{{ model.countLabel }}</span>
    </div>
  </div>
</template>

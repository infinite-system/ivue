<script setup lang="ts">
import type { ExpressionModel } from './ExpressionModel';

defineProps<{ model: ExpressionModel.Instance }>();
</script>

<template>
  <div class="em-mail">
    <div class="em-fields">
      <label><span>To</span><input :value="model.emailTo" :readonly="!model.canEdit" aria-label="To" placeholder="editor@…" @input="model.onMetaInput('to', $event)" /></label>
      <label><span>Subject</span><input :value="model.subject" :readonly="!model.canEdit" aria-label="Subject" @input="model.onMetaInput('subject', $event)" /></label>
    </div>
    <p
      class="em-body"
      :contenteditable="model.editableAttribute"
      spellcheck="true"
      @input="model.onBodyInput($event)"
      @paste="model.onPaste($event)"
      @blur="model.saveBody()"
      v-text="model.record.body"
    ></p>
    <div class="x-foot">
      <span class="x-count">{{ model.countLabel }}</span>
      <span class="muted">Copy yields subject, a blank line, then the body</span>
    </div>
  </div>
</template>

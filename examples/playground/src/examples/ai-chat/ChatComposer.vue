<script setup lang="ts">
import { Composer } from './Composer';

const props = defineProps<Composer.Props>();

const model = new Composer.Class(props);
const {
  // state refs
  draft,
  modelId,
  attachments,
  dragOver,
  // element refs
  inputElement,
} = model;
</script>

<template>
  <form class="ac-composer" :class="{ 'ac-drag-over': dragOver }" @submit.prevent="model.send()" @dragover="model.onDragOver($event)" @dragleave="model.onDragLeave()" @drop="model.onDrop($event)">
    <div v-if="attachments.length" class="ac-attachments">
      <div v-for="attachment in attachments" :key="attachment.url" class="ac-chip">
        <img v-if="model.isImage(attachment)" :src="attachment.url" alt="" />
        <span class="ac-chip-name">{{ attachment.name }}</span>
        <span class="ac-chip-size">{{ model.sizeLabel(attachment) }}</span>
        <button type="button" class="ac-chip-remove" title="Remove" @click="model.remove(attachment)">×</button>
      </div>
    </div>
    <div class="ac-composer-row">
      <textarea ref="inputElement" v-model="draft" class="ac-input" rows="2" :placeholder="model.placeholder" @keydown="model.onKeydown($event)" @paste="model.onPaste($event)"></textarea>
    </div>
    <div class="ac-composer-bar">
      <label class="ac-model">
        <span class="ac-model-label">Model</span>
        <select v-model="modelId" class="ac-select">
          <option v-for="option in model.models" :key="option.id" :value="option.id">{{ option.label }}</option>
        </select>
        <span class="ac-model-hint">{{ model.modelHint }}</span>
      </label>
      <label class="ac-attach" title="Attach an image or a file — it never leaves this tab">
        <span>+ attach</span>
        <input type="file" multiple hidden @change="model.onPick($event)" />
      </label>
      <span class="ac-composer-spacer"></span>
      <button v-if="chat.isStreaming" type="button" class="ac-btn" @click="model.stop()">Stop</button>
      <button type="submit" class="ac-btn ac-btn-primary" :disabled="!model.canSend">{{ model.sendLabel }}</button>
    </div>
  </form>
</template>

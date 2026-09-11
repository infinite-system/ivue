<script setup lang="ts">
import { Composer } from './Composer';

const props = defineProps<Composer.Props>();

const model = new (
  (props.kit?.namespace.Class as typeof Composer.Class | undefined) ?? Composer.Class
)(props);
const {
  // state refs
  draft,
  attachments,
  dragOver,
  // element refs
  inputElement
} = model;
</script>

<template>
  <form
    class="ac-composer"
    :class="{ 'ac-drag-over': dragOver, 'ac-streaming': chat.isStreaming }"
    @submit.prevent="model.send()"
    @dragover="model.onDragOver($event)"
    @dragleave="model.onDragLeave()"
    @drop="model.onDrop($event)"
  >
    <div class="ac-composer-card">
      <div v-if="attachments.length" class="ac-attachments">
        <div v-for="attachment in attachments" :key="attachment.url" class="ac-chip">
          <img v-if="model.isImage(attachment)" :src="attachment.url" alt="" />
          <span class="ac-chip-name">{{ attachment.name }}</span>
          <span class="ac-chip-size">{{ model.sizeLabel(attachment) }}</span>
          <button
            type="button"
            class="ac-chip-remove"
            title="Remove"
            @click="model.remove(attachment)"
          >
            ×
          </button>
        </div>
      </div>
      <textarea
        ref="inputElement"
        v-model="draft"
        class="ac-input"
        rows="1"
        :placeholder="model.placeholder"
        @keydown="model.onKeydown($event)"
        @paste="model.onPaste($event)"
      ></textarea>
      <div class="ac-composer-bar">
        <label class="ac-attach" title="Attach an image or a file — it never leaves this tab">
          <span class="ac-attach-icon" aria-hidden="true">+</span>
          <input type="file" multiple hidden @change="model.onPick($event)" />
        </label>
        <component :is="model.kit.Picker.view" :kit="model.kit.Picker" :composer="model" />
        <span class="ac-model-hint">{{ model.modelHint }}</span>
        <span class="ac-composer-spacer"></span>
        <button
          type="button"
          class="ac-search-btn"
          title="Search the thread (⌘K)"
          @click="chat.toggleSearch()"
        >
          <svg class="ac-btn-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path :d="model.searchIcon" /></svg
          ><span class="ac-sr">Search the thread</span>
        </button>
        <button
          v-if="chat.isStreaming"
          type="button"
          class="ac-stop"
          title="Stop"
          @click="model.stop()"
        >
          <span aria-hidden="true">■</span><span class="ac-sr">Stop</span>
        </button>
        <button
          v-else
          type="submit"
          class="ac-send"
          :disabled="!model.canSend"
          :title="model.sendLabel"
        >
          <span aria-hidden="true">↑</span><span class="ac-sr">{{ model.sendLabel }}</span>
        </button>
      </div>
    </div>
  </form>
</template>

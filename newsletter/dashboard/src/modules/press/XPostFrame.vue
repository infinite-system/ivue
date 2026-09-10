<script setup lang="ts">
import type { ExpressionModel } from './ExpressionModel';

defineProps<{ model: ExpressionModel.Instance }>();
</script>

<template>
  <div class="x-tweet x-single">
    <div class="x-avatar" aria-hidden="true">{{ model.xName.slice(0, 1) }}</div>
    <div class="x-body">
      <div class="x-head">
        <strong>{{ model.xName }}</strong>
        <span class="muted">{{ model.xHandle }}</span>
        <span class="x-number">{{ model.platformLabel }}</span>
      </div>
      <p
        class="x-text"
        :contenteditable="model.editableAttribute"
        spellcheck="true"
        @input="model.onBodyInput($event)"
        @paste="model.onPaste($event)"
        @blur="model.saveBody()"
        v-text="model.record.body"
      ></p>
      <div v-if="model.showsMedia(model.record)" class="x-media" :class="{ drop: model.canEdit }" @dragover="model.onImageDragOver($event)" @drop="model.onImageDrop(model.record, $event)">
        <figure v-for="url in model.imageUrls(model.record)" :key="url" class="x-media-item">
          <img :src="url" alt="" />
          <button v-if="model.canEdit" class="x-media-remove" type="button" title="Remove image" @click="model.removeImage(model.record, url)">×</button>
        </figure>
        <label v-if="model.canAddImage(model.record)" class="x-media-add" title="Drop images here or pick from disk">
          <span>+ image</span>
          <input type="file" accept="image/*" multiple hidden @change="model.onImagePicked(model.record, $event)" />
        </label>
      </div>
      <p v-if="model.afterFold" class="x-fold" aria-hidden="true">
        <span class="x-fold-line"></span>
        <span>Show more — the timeline folds here</span>
      </p>
      <div class="x-foot">
        <span class="x-count" :class="{ over: model.bodyOver }">{{ model.countLabel }}</span>
      </div>
    </div>
  </div>
</template>

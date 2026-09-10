<script setup lang="ts">
import type { ExpressionModel } from './ExpressionModel';

defineProps<{ model: ExpressionModel.Instance }>();
</script>

<template>
  <ol class="x-thread" aria-label="Thread">
    <li
      v-for="entry in model.numbered"
      :key="entry.child.id"
      class="x-tweet"
      :class="[model.segmentTone(entry.child), { dragging: model.isDragging(entry.child) }]"
      :draggable="model.canEdit"
      @dragstart="model.onDragStart(entry.child)"
      @dragover="model.onDragOver($event)"
      @drop="model.onDrop(entry.child)"
    >
      <div class="x-avatar" aria-hidden="true">{{ model.xName.slice(0, 1) }}</div>
      <div class="x-body">
        <div class="x-head">
          <strong>{{ model.xName }}</strong>
          <span class="muted">{{ model.xHandle }}</span>
          <span class="x-number">{{ model.segmentNumberLabel(entry) }}</span>
        </div>
        <p
          class="x-text"
          :contenteditable="model.editableAttribute"
          spellcheck="true"
          @input="model.onSegmentInput(entry.child, $event)"
          @paste="model.onPaste($event)"
          @blur="model.saveSegment(entry.child)"
          v-text="entry.child.body"
        ></p>
        <div v-if="model.showsMedia(entry.child)" class="x-media" :class="{ drop: model.canEdit }" @dragover="model.onImageDragOver($event)" @drop="model.onImageDrop(entry.child, $event)">
          <figure v-for="url in model.imageUrls(entry.child)" :key="url" class="x-media-item">
            <img :src="url" alt="" />
            <button v-if="model.canEdit" class="x-media-remove" type="button" title="Remove image" @click="model.removeImage(entry.child, url)">×</button>
          </figure>
          <label v-if="model.canAddImage(entry.child)" class="x-media-add" title="Drop images here or pick from disk">
            <span>+ image</span>
            <input type="file" accept="image/*" multiple hidden @change="model.onImagePicked(entry.child, $event)" />
          </label>
        </div>
        <div class="x-foot">
          <span class="x-count" :class="{ over: model.segmentOver(entry.child), folds: model.segmentPastFold(entry.child) }">{{ model.segmentCountLabel(entry.child) }}</span>
          <span v-if="model.segmentPastFold(entry.child)" class="x-fold-note">folds at 280</span>
          <button class="ghost x-action" type="button" @click="model.copySegment(entry.child)">{{ model.copyLabel(model.segmentKey(entry.child)) }}</button>
          <button class="ghost x-action" type="button" @click="model.setSkipped(entry.child, !entry.child.skipped)">{{ model.skipLabel(entry.child) }}</button>
        </div>
      </div>
    </li>
  </ol>
  <button v-if="model.canEdit" class="ghost x-add" type="button" @click="model.addSegment()">Add tweet</button>
</template>

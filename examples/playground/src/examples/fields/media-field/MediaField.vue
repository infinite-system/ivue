<script lang="ts" setup>
// MediaField.vue — the Advanced Media Uploader.
//
// Two extension mechanisms are showcased here:
//   1. The `runner` prop swaps the driving CLASS (any MediaField subclass).
//   2. Every slot has `before--`/`after--` variants (ExtendSlots) — a parent
//      injects templates at any point without duplicating this file — and the
//      `item` slot REPLACES the whole per-file row (ExtendedMediaField.vue
//      swaps the list rows for a square-tile grid through it).
// ExtendedMediaField.vue uses BOTH at once.
import {
  QBadge,
  QBtn,
  QIcon,
  QLinearProgress,
  QSpinner,
  QTooltip,
} from 'quasar';

import { MediaField } from './MediaField';
import MediaFieldPreviewDialog from './MediaFieldPreviewDialog.vue';
const props = defineProps(MediaField.props);
/** Object-declared emits — ExtractEmitTypes derives the class-facing type. */
const emit = defineEmits(MediaField.emits) as MediaField.Emits;
defineSlots<MediaField.Slots>();

/** Runner implementation: swap the class that drives this component. */
const RunnerClass = (props.runner ?? MediaField.Class) as typeof MediaField.Class;
const media = new RunnerClass(props, emit);

const {
  // state refs
  isUploading,
  isHydrating,
  isDragOver,
  errorMessage,
  renameId,
  renameDraft,
  previewOpen,
  // element refs
  fileInput,
} = media;

defineExpose(media as MediaField.Instance);
</script>

<template>
  <div
    class="media-field"
    :class="{
      'media-field--dense': media.dense,
      'media-field--disabled': media.disable,
      'media-field--readonly': media.readonly,
      'media-field--error': media.hasError,
    }"
  >
    <!-- HEADER -->
    <slot name="before--header" :field="media" />
    <slot name="header" :field="media">
      <div class="media-field__header">
        <span class="media-field__label">{{ media.label }}</span>
        <q-badge
          v-if="media.hasFiles"
          rounded
          color="grey-3"
          text-color="black"
          class="media-field__count"
          :label="media.fileCountLabel"
        />
        <q-spinner v-if="isUploading || isHydrating" size="16px" :thickness="2" />
      </div>
    </slot>
    <slot name="after--header" :field="media" />

    <!-- DROP ZONE -->
    <div
      class="media-field__dropzone"
      :class="{
        'media-field__dropzone--over': isDragOver,
        'media-field__dropzone--clickable': media.canAddMore,
      }"
      @dragover="media.onDragOver"
      @dragleave="media.onDragLeave"
      @drop="media.onDrop"
    >
      <input
        ref="fileInput"
        type="file"
        class="media-field__native-input"
        :accept="media.accept"
        :multiple="media.multiple"
        @change="media.onFilesPicked"
      />

      <!-- EMPTY STATE -->
      <template v-if="!media.hasFiles">
        <slot name="before--empty" :field="media" />
        <slot name="empty" :field="media">
          <div class="media-field__empty" @click="media.pickFiles()">
            <q-icon name="cloud_upload" size="34px" color="grey-6" />
            <div class="media-field__empty-hint">{{ media.dropHint }}</div>
            <div class="media-field__empty-types">
              {{ media.acceptedTypesText }} — up to
              {{ media.maxFileSizeLabel }} each
            </div>
          </div>
        </slot>
        <slot name="after--empty" :field="media" />
      </template>

      <!-- FILE LIST — v1-style rows: [thumb] [name / caption / meta] [remove] -->
      <div v-else class="media-field__list">
        <div
          v-for="(row, index) in media.displayFiles"
          :key="row.id"
          class="media-field__item"
          :class="{ 'media-field__item--dragging': media.dragIndex.value === index }"
          :draggable="media.canSort"
          @dragstart="media.onRowDragStart(index)"
          @dragover.prevent
          @drop.prevent="media.onRowDrop(index)"
          @dragend="media.dragIndex.value = null"
        >
          <slot name="before--item" :row="row" :index="index" :field="media" />
          <slot name="item" :row="row" :index="index" :field="media">
            <!-- SORT BUTTONS — visible on hover, like the original -->
            <div v-if="media.canSort" class="media-field__sort" @click.stop>
              <q-btn
                icon="arrow_upward"
                flat
                size="xs"
                round
                :disable="index === 0"
                @click="media.fileMoveUp(index)"
              >
                <q-tooltip class="bg-grey-9">Move up</q-tooltip>
              </q-btn>
              <q-btn
                icon="arrow_downward"
                flat
                size="xs"
                round
                :disable="index === media.displayFiles.length - 1"
                @click="media.fileMoveDown(index)"
              >
                <q-tooltip class="bg-grey-9">Move down</q-tooltip>
              </q-btn>
            </div>
            <!-- THUMBNAIL BOX -->
            <div
              class="media-field__thumb"
              :class="{ 'media-field__thumb--clickable': media.canPreview }"
              @click="media.openPreview(index)"
            >
              <img
                v-if="media.isImage(row)"
                :src="row.thumbnailUrl"
                :alt="row.name"
                class="media-field__thumb-image"
              />
              <div v-else class="media-field__thumb-extension">
                {{ media.fileExtension(row) }}
              </div>

              <!-- DOWNLOAD — overlays the thumb's bottom-right corner -->
              <div class="media-field__thumb-download" @click.stop>
                <q-btn
                  v-if="media.canDownload"
                  dense
                  unelevated
                  size="10px"
                  padding="2px 4px"
                  icon="download"
                  class="media-field__download-btn"
                  @click="media.downloadFile(row)"
                >
                  <q-tooltip class="bg-grey-9">Download</q-tooltip>
                </q-btn>
              </div>
            </div>

            <!-- FILE DETAILS -->
            <div class="media-field__details">
              <!-- FILE NAME — inline rename (v1 borderless input) -->
              <input
                v-if="media.canRename"
                class="media-field__filename-input"
                placeholder="File Name"
                type="text"
                :value="renameId === row.id ? renameDraft : row.name"
                :title="row.name"
                @focus="media.startRename(row)"
                @input="renameDraft = ($event.target as HTMLInputElement).value"
                @keydown.enter.prevent="media.commitRename()"
                @keydown.esc="media.cancelRename()"
                @blur="media.commitRename()"
              />
              <div v-else class="media-field__item-name" :title="row.name">
                {{ row.name }}
              </div>

              <!-- FILE CAPTION -->
              <input
                v-if="media.canRenameCaption"
                v-model="row.caption"
                class="media-field__filename-input media-field__caption-line"
                placeholder="File Caption"
                type="text"
                @keydown.enter="(event) => event.preventDefault()"
              />
              <div v-else-if="row.caption" class="media-field__caption-line">
                {{ row.caption }}
              </div>

              <!-- EXTENSION BADGE / SIZE / STATUS -->
              <div class="media-field__meta">
                <q-badge
                  color="grey-3"
                  text-color="black"
                  class="media-field__meta-extension"
                  :label="media.fileExtension(row)"
                />
                <span class="media-field__meta-size">
                  {{ media.sizeLabel(row) }}
                </span>
                <span class="media-field__meta-status">
                  <q-icon name="check_circle" size="12px" color="positive" />
                  Uploaded
                </span>
              </div>
            </div>

            <!-- ROW ACTIONS — remove at the far right, top-aligned -->
            <div class="media-field__row-side" @click.stop>
              <slot
                name="before--item-actions"
                :row="row"
                :index="index"
                :field="media"
              />
              <slot
                name="item-actions"
                :row="row"
                :index="index"
                :field="media"
              />
              <slot
                name="after--item-actions"
                :row="row"
                :index="index"
                :field="media"
              />
              <q-btn
                v-if="media.canRemove"
                dense
                flat
                round
                size="10px"
                icon="close"
                @click="media.removeFile(row)"
              >
                <q-tooltip class="bg-grey-9">Remove</q-tooltip>
              </q-btn>
            </div>
          </slot>
          <slot name="after--item" :row="row" :index="index" :field="media" />
        </div>

        <!-- ADD-MORE AFFORDANCE -->
        <div
          v-if="media.canAddMore"
          class="media-field__add"
          @click="media.pickFiles()"
        >
          <q-icon name="attach_file" size="16px" />
          <span class="media-field__add-label">Add files</span>
        </div>
      </div>

      <q-linear-progress
        v-if="isUploading"
        indeterminate
        color="primary"
        class="media-field__progress"
      />
      <div v-if="isUploading" class="media-field__progress-label">
        {{ media.uploadProgressLabel }}
      </div>
    </div>

    <!-- ERROR / HINT LINE -->
    <div v-if="media.hasError" class="media-field__bottom media-field__bottom--error">
      {{ errorMessage }}
    </div>
    <div v-else-if="media.hint" class="media-field__bottom">
      {{ media.hint }}
    </div>

    <!-- PREVIEW LIGHTBOX -->
    <MediaFieldPreviewDialog v-model="previewOpen" :field="media" />
  </div>
</template>

<style scoped>
.media-field {
  width: 100%;
}

.media-field--disabled {
  opacity: 0.6;
  pointer-events: none;
}

.media-field__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 6px;
}

.media-field__label {
  font-size: 14px;
  color: color-mix(in srgb, currentColor 70%, transparent);
}

.media-field--error .media-field__label {
  color: var(--q-negative, #c10015);
}

.media-field__count {
  font-size: 10px;
}

.media-field__dropzone {
  position: relative;
  border: 1px solid color-mix(in srgb, currentColor 28%, transparent);
  border-radius: 6px;
  background: color-mix(in srgb, currentColor 3%, transparent);
  transition: border-color 0.2s, background 0.2s;
}

.media-field__dropzone--over {
  border-color: var(--q-primary, #1976d2);
  background: rgba(25, 118, 210, 0.06);
}

.media-field--error .media-field__dropzone {
  border-color: var(--q-negative, #c10015);
}

.media-field__native-input {
  display: none;
}

.media-field__empty {
  padding: 26px 16px;
  text-align: center;
  cursor: pointer;
  user-select: none;
}

.media-field--dense .media-field__empty {
  padding: 14px 12px;
}

.media-field__empty-hint {
  margin-top: 6px;
  font-size: 13px;
  color: color-mix(in srgb, currentColor 70%, transparent);
}

.media-field__empty-types {
  margin-top: 2px;
  font-size: 13px;
  color: color-mix(in srgb, currentColor 45%, transparent);
}

/* --- v1 LIST-ROW LAYOUT --- */

.media-field__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
}

.media-field--dense .media-field__list {
  gap: 2px;
  padding: 4px;
}

/* Each file is a full-width horizontal row. */
.media-field__item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  padding: 5px 6px;
  border-radius: 4px;
  transition: background 0.3s;
}

.media-field__item:hover {
  background: color-mix(in srgb, currentColor 4%, transparent);
}

/* Thumbnail box — v1: max-width 120px, height 60px, inset-shadow well. */
.media-field__thumb {
  position: relative;
  flex: 0 0 120px;
  max-width: 120px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
  background: color-mix(in srgb, currentColor 8%, transparent);
  box-shadow: inset 2px 0 10px 5px
    color-mix(in srgb, currentColor 7%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-field__thumb--clickable {
  cursor: pointer;
}

.media-field__thumb-image {
  width: 100%;
  height: 100%;
  aspect-ratio: 16 / 9;
  object-fit: contain;
  display: block;
}

.media-field__thumb-extension {
  font-size: 24px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: color-mix(in srgb, currentColor 45%, transparent);
}

.media-field__thumb-download {
  position: absolute;
  right: 4px;
  bottom: 4px;
}

.media-field__download-btn {
  border-radius: 3px;
  background: color-mix(in srgb, currentColor 12%, transparent);
  color: var(--q-primary, #1976d2);
}

/* Details column — name / caption / meta line. */
.media-field__details {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  padding-top: 2px;
}

.media-field__item-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* v1 inline-rename input — borderless; the border materializes on row hover. */
.media-field__filename-input {
  width: 100%;
  font-size: 12px;
  color: inherit;
  background: none;
  outline: none;
  border: 0;
  border-bottom: 1px solid transparent;
  line-height: 14px;
  padding: 0 0 1px;
  transition: border-color 0.3s;
}

.media-field__item:hover .media-field__filename-input {
  border-bottom-color: color-mix(in srgb, currentColor 22%, transparent);
}

.media-field__item:hover .media-field__filename-input:hover {
  border-bottom-color: color-mix(in srgb, currentColor 45%, transparent);
}

.media-field__filename-input:focus,
.media-field__item:hover .media-field__filename-input:focus {
  border-bottom-color: var(--q-primary, #1976d2);
}

.media-field__caption-line {
  color: color-mix(in srgb, currentColor 55%, transparent);
}

.media-field__caption-line::placeholder {
  color: color-mix(in srgb, currentColor 35%, transparent);
}

/* Meta line — extension badge + size + status. */
.media-field__meta {
  display: flex;
  flex-wrap: wrap;
  min-width: 0;
  align-items: center;
  gap: 4px 8px;
  font-size: 11px;
  color: color-mix(in srgb, currentColor 55%, transparent);
}

.media-field__meta-extension {
  font-size: 10px;
  text-transform: uppercase;
}

.media-field__meta-size {
  text-transform: uppercase;
}

.media-field__meta-status {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  text-transform: uppercase;
}

/* Remove button cluster — far right, top-aligned. */
.media-field__row-side {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 2px;
  align-self: flex-start;
  color: color-mix(in srgb, currentColor 60%, transparent);
}

/* Add-more affordance — a solid full-width row. */
.media-field__add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
  border-radius: 4px;
  cursor: pointer;
  color: color-mix(in srgb, currentColor 60%, transparent);
  transition: border-color 0.2s;
}

.media-field__add:hover {
  border-color: var(--q-primary, #1976d2);
}

.media-field__add-label {
  font-size: 13.5px;
  font-weight: 500;
}

.media-field__progress {
  border-radius: 0 0 6px 6px;
}

.media-field__progress-label {
  position: absolute;
  right: 8px;
  bottom: 6px;
  font-size: 11px;
  color: color-mix(in srgb, currentColor 55%, transparent);
}

/*
 * Hint/error line with native-Quasar spacing. The v1 field let the hint
 * crowd the control (no top padding — a long-standing bug); Quasar's own
 * .q-field__bottom reserves breathing room, so we match it here.
 */
.media-field__bottom {
  padding-top: 6px;
  font-size: 12px;
  line-height: 1;
  min-height: 18px;
  color: color-mix(in srgb, currentColor 60%, transparent);
}

.media-field__bottom--error {
  color: var(--q-negative, #c10015);
}

/* sort buttons: hidden until the row is hovered, like the original */
.media-field__sort {
  display: flex;
  flex-direction: column;
  justify-content: center;
  visibility: hidden;
  opacity: 0.7;
}
.media-field__item:hover .media-field__sort {
  visibility: visible;
}
.media-field__item--dragging {
  opacity: 0.45;
}
</style>

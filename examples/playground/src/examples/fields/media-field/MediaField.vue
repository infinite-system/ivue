<script lang="ts" setup>
// MediaField.vue — the Advanced Media Uploader.
//
// Two extension mechanisms are showcased here:
//   1. The `runner` prop swaps the driving CLASS (any MediaField subclass).
//   2. Every slot has `before--`/`after--` variants (ExtendSlots) — a parent
//      injects templates at any point without duplicating this file.
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
import {
  mediaFieldEmits,
  mediaFieldProps,
  type MediaFieldEmits,
  type MediaFieldSlots,
} from './MediaFieldProps';

const props = defineProps(mediaFieldProps);
/** Object-declared emits — ExtractEmitTypes derives the class-facing type. */
const emit = defineEmits(mediaFieldEmits) as MediaFieldEmits;
defineSlots<MediaFieldSlots>();

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

/** Autofocus the rename input the moment it renders (used as v-focus). */
const vFocus = {
  mounted: (element: HTMLInputElement) => element.focus(),
};
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

      <!-- THUMBNAIL GRID -->
      <div v-else class="media-field__grid">
        <div
          v-for="(row, index) in media.displayFiles"
          :key="row.id"
          class="media-field__item"
          :style="media.thumbnailStyle"
        >
          <slot name="before--item" :row="row" :index="index" :field="media" />
          <slot name="item" :row="row" :index="index" :field="media">
            <!-- THUMBNAIL / FILE-TYPE ICON -->
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
              <div v-else class="media-field__thumb-placeholder">
                <q-icon :name="media.fileIcon(row)" size="30px" color="grey-6" />
                <span class="media-field__thumb-extension">
                  {{ media.fileExtension(row) }}
                </span>
              </div>

              <!-- HOVER ACTIONS -->
              <div class="media-field__actions" @click.stop>
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
                >
                  <q-btn
                    v-if="media.canPreview"
                    dense
                    flat
                    round
                    size="10px"
                    icon="visibility"
                    color="white"
                    @click="media.openPreview(index)"
                  >
                    <q-tooltip class="bg-grey-9">Preview</q-tooltip>
                  </q-btn>
                  <q-btn
                    v-if="media.canDownload"
                    dense
                    flat
                    round
                    size="10px"
                    icon="download"
                    color="white"
                    @click="media.downloadFile(row)"
                  >
                    <q-tooltip class="bg-grey-9">Download</q-tooltip>
                  </q-btn>
                  <q-btn
                    v-if="media.canRename"
                    dense
                    flat
                    round
                    size="10px"
                    icon="edit"
                    color="white"
                    @click="media.startRename(row)"
                  >
                    <q-tooltip class="bg-grey-9">Rename</q-tooltip>
                  </q-btn>
                  <q-btn
                    v-if="media.canRemove"
                    dense
                    flat
                    round
                    size="10px"
                    icon="close"
                    color="white"
                    @click="media.removeFile(row)"
                  >
                    <q-tooltip class="bg-grey-9">Remove</q-tooltip>
                  </q-btn>
                </slot>
                <slot
                  name="after--item-actions"
                  :row="row"
                  :index="index"
                  :field="media"
                />
              </div>
            </div>

            <!-- NAME / RENAME / SIZE -->
            <div class="media-field__item-footer">
              <input
                v-if="renameId === row.id"
                v-model="renameDraft"
                v-focus
                class="media-field__rename-input"
                placeholder="File name"
                @keydown.enter.prevent="media.commitRename()"
                @keydown.esc="media.cancelRename()"
                @blur="media.commitRename()"
              />
              <div v-else class="media-field__item-name" :title="row.name">
                {{ row.name }}
              </div>
              <div class="media-field__item-size">{{ media.sizeLabel(row) }}</div>
            </div>
          </slot>
          <slot name="after--item" :row="row" :index="index" :field="media" />
        </div>

        <!-- ADD-MORE TILE -->
        <div
          v-if="media.canAddMore"
          class="media-field__item media-field__add-tile"
          :style="media.thumbnailStyle"
          @click="media.pickFiles()"
        >
          <q-icon name="add" size="26px" color="grey-6" />
          <span class="media-field__add-label">Add</span>
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
  border: 1px dashed color-mix(in srgb, currentColor 28%, transparent);
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
  font-size: 11px;
  color: color-mix(in srgb, currentColor 45%, transparent);
}

.media-field__grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px;
}

.media-field--dense .media-field__grid {
  gap: 6px;
  padding: 6px;
}

.media-field__item {
  flex: 0 0 auto;
}

.media-field__thumb {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 4px;
  overflow: hidden;
  background: color-mix(in srgb, currentColor 8%, transparent);
  box-shadow: inset 0 0 10px 2px color-mix(in srgb, currentColor 6%, transparent);
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
  object-fit: cover;
  display: block;
}

.media-field__thumb-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.media-field__thumb-extension {
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: color-mix(in srgb, currentColor 55%, transparent);
}

.media-field__actions {
  position: absolute;
  inset: auto 0 0 0;
  display: flex;
  justify-content: center;
  gap: 2px;
  padding: 3px 2px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.55));
  opacity: 0;
  transition: opacity 0.2s;
}

.media-field__item:hover .media-field__actions {
  opacity: 1;
}

.media-field__item-footer {
  padding: 4px 2px 0;
}

.media-field__item-name {
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.media-field__item-size {
  font-size: 11px;
  color: color-mix(in srgb, currentColor 50%, transparent);
}

.media-field__rename-input {
  width: 100%;
  font-size: 12px;
  background: none;
  outline: none;
  border: 0;
  border-bottom: 1px solid var(--q-primary, #1976d2);
  padding: 0 0 1px;
}

.media-field__add-tile {
  aspect-ratio: 1 / 1;
  border: 1px dashed color-mix(in srgb, currentColor 25%, transparent);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
  color: color-mix(in srgb, currentColor 60%, transparent);
  transition: border-color 0.2s;
}

.media-field__add-tile:hover {
  border-color: var(--q-primary, #1976d2);
}

.media-field__add-label {
  font-size: 11px;
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
</style>

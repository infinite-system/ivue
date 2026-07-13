<script lang="ts" setup>
// ExtendedMediaField.vue — demonstrates BOTH extension mechanisms at once:
//   1. CLASS extension: `:runner="ExtendedMediaField.Class"` makes the base
//      MediaField.vue construct the subclass — every slot receives it as
//      `field`, so injected templates call the subclass's extra members.
//   2. TEMPLATE injection: the `item` slot REPLACES the base's per-file list
//      row with a square thumbnail tile — the base renders list rows, this
//      component pulls in a completely different item template while the
//      same class hierarchy drives both. `before--`/`after--` slot variants
//      (ExtendSlots) add the sort toolbar without copying the base template.
import { QBadge, QBtn, QIcon, QTooltip } from 'quasar';

import { ExtendedMediaField } from './ExtendedMediaField';
import MediaField from './MediaField.vue';
import {
  mediaFieldEmits,
  mediaFieldProps,
  type MediaFieldEmits,
} from './MediaFieldProps';

const props = defineProps(mediaFieldProps);
/** Object-declared emits — ExtractEmitTypes derives the callable type. */
const emit = defineEmits(mediaFieldEmits) as MediaFieldEmits;

/** Square tile edge — v-bound into the grid styles below. */
const tileSize = `${props.thumbnailSize ?? 132}px`;

/** Autofocus the rename input the moment it renders (used as v-focus). */
const vFocus = {
  mounted: (element: HTMLInputElement) => element.focus(),
};
</script>

<template>
  <MediaField
    v-bind="props"
    class="extended-media"
    :runner="ExtendedMediaField.Class"
    @update:model-value="(value) => emit('update:modelValue', value)"
    @uploaded="(rows) => emit('uploaded', rows)"
    @removed="(row) => emit('removed', row)"
    @error="(message) => emit('error', message)"
  >
    <!-- SORT TOGGLE + TOTAL SIZE — injected after the base header -->
    <template #after--header="{ field }">
      <div v-if="field.hasFiles" class="extended-media__toolbar">
        <q-btn
          flat
          size="11px"
          class="extended-media__sort-btn"
          :icon="field.sortModeIcon"
          :label="field.sortModeLabel"
          @click="field.toggleSortMode()"
        >
          <q-tooltip class="bg-grey-9">Toggle sort order</q-tooltip>
        </q-btn>
        <q-badge
          color="grey-3"
          text-color="black"
          :label="'Total ' + field.totalSizeLabel"
        />
      </div>
    </template>

    <!-- SQUARE TILE — full replacement of the base's per-file list row -->
    <template #item="{ row, index, field }">
      <div class="extended-media__tile">
        <!-- SQUARE THUMBNAIL -->
        <div
          class="extended-media__thumb"
          :class="{ 'extended-media__thumb--clickable': field.canPreview }"
          @click="field.openPreview(index)"
        >
          <img
            v-if="field.isImage(row)"
            :src="row.thumbnailUrl"
            :alt="row.name"
            class="extended-media__thumb-image"
          />
          <div v-else class="extended-media__thumb-placeholder">
            <q-icon :name="field.fileIcon(row)" size="30px" color="grey-6" />
            <span class="extended-media__thumb-extension">
              {{ field.fileExtension(row) }}
            </span>
          </div>

          <!-- DIMENSIONS BADGE -->
          <q-badge
            v-if="field.dimensionsOf(row)"
            color="grey-3"
            text-color="black"
            class="extended-media__dimensions"
            :label="field.dimensionsOf(row)"
          />

          <!-- HOVER ACTIONS — incl. the subclass's copy-URL -->
          <div class="extended-media__actions" @click.stop>
            <q-btn
              v-if="field.canPreview"
              dense
              flat
              round
              size="10px"
              icon="visibility"
              color="white"
              @click="field.openPreview(index)"
            >
              <q-tooltip class="bg-grey-9">Preview</q-tooltip>
            </q-btn>
            <q-btn
              v-if="field.canDownload"
              dense
              flat
              round
              size="10px"
              icon="download"
              color="white"
              @click="field.downloadFile(row)"
            >
              <q-tooltip class="bg-grey-9">Download</q-tooltip>
            </q-btn>
            <q-btn
              v-if="field.canRename"
              dense
              flat
              round
              size="10px"
              icon="edit"
              color="white"
              @click="field.startRename(row)"
            >
              <q-tooltip class="bg-grey-9">Rename</q-tooltip>
            </q-btn>
            <q-btn
              dense
              flat
              round
              size="10px"
              :icon="field.copiedId.value === row.id ? 'check' : 'link'"
              color="white"
              @click="field.copyUrl(row)"
            >
              <q-tooltip class="bg-grey-9">
                {{ field.copiedId.value === row.id ? 'Copied!' : 'Copy URL' }}
              </q-tooltip>
            </q-btn>
            <q-btn
              v-if="field.canRemove"
              dense
              flat
              round
              size="10px"
              icon="close"
              color="white"
              @click="field.removeFile(row)"
            >
              <q-tooltip class="bg-grey-9">Remove</q-tooltip>
            </q-btn>
          </div>
        </div>

        <!-- NAME / RENAME / SIZE -->
        <div class="extended-media__tile-footer">
          <input
            v-if="field.renameId.value === row.id"
            v-model="field.renameDraft.value"
            v-focus
            class="extended-media__rename-input"
            placeholder="File name"
            @keydown.enter.prevent="field.commitRename()"
            @keydown.esc="field.cancelRename()"
            @blur="field.commitRename()"
          />
          <div v-else class="extended-media__tile-name" :title="row.name">
            {{ row.name }}
          </div>
          <div class="extended-media__tile-size">{{ field.sizeLabel(row) }}</div>
        </div>

        <!-- CAPTION EDITOR -->
        <input
          v-if="field.captionId.value === row.id"
          v-model="field.captionDraft.value"
          class="extended-media__caption-input"
          placeholder="Caption"
          @keydown.enter.prevent="field.commitCaption()"
          @keydown.esc="field.cancelCaption()"
          @blur="field.commitCaption()"
        />
        <div
          v-else-if="field.canRenameCaption"
          class="extended-media__caption"
          :class="{ 'extended-media__caption--empty': !row.caption }"
          @click="field.startCaption(row)"
        >
          {{ row.caption || 'Add caption…' }}
        </div>
        <div v-else-if="row.caption" class="extended-media__caption">
          {{ row.caption }}
        </div>
      </div>
    </template>
  </MediaField>
</template>

<style scoped>
.extended-media__toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 6px;
}

/* The base lays files out as full-width rows; the tile variant turns the
   same list container into a wrapping grid of fixed-width square tiles. */
.extended-media :deep(.media-field__list) {
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px;
}

.extended-media :deep(.media-field__item) {
  display: block;
  width: auto;
  flex: 0 0 auto;
  padding: 0;
}

.extended-media :deep(.media-field__item:hover) {
  background: none;
}

/* The add affordance becomes a square tile alongside the thumbnails. */
.extended-media :deep(.media-field__add) {
  width: v-bind(tileSize);
  aspect-ratio: 1 / 1;
  flex-direction: column;
  gap: 2px;
  padding: 0;
}

.extended-media__tile {
  width: v-bind(tileSize);
}

.extended-media__thumb {
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

.extended-media__thumb--clickable {
  cursor: pointer;
}

.extended-media__thumb-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.extended-media__thumb-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.extended-media__thumb-extension {
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: color-mix(in srgb, currentColor 55%, transparent);
}

.extended-media__dimensions {
  position: absolute;
  top: 4px;
  left: 4px;
  font-size: 10px;
}

.extended-media__actions {
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

.extended-media__tile:hover .extended-media__actions {
  opacity: 1;
}

.extended-media__tile-footer {
  padding: 4px 2px 0;
}

.extended-media__tile-name {
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.extended-media__tile-size {
  font-size: 11px;
  color: color-mix(in srgb, currentColor 50%, transparent);
}

.extended-media__rename-input {
  width: 100%;
  font-size: 12px;
  color: inherit;
  background: none;
  outline: none;
  border: 0;
  border-bottom: 1px solid var(--q-primary, #1976d2);
  padding: 0 0 1px;
}

.extended-media__caption {
  padding: 2px 2px 0;
  font-size: 11px;
  color: color-mix(in srgb, currentColor 60%, transparent);
  cursor: text;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.extended-media__caption--empty {
  color: color-mix(in srgb, currentColor 35%, transparent);
  font-style: italic;
}

.extended-media__caption-input {
  width: 100%;
  margin-top: 2px;
  font-size: 11px;
  color: inherit;
  background: none;
  outline: none;
  border: 0;
  border-bottom: 1px solid var(--q-primary, #1976d2);
  padding: 0 0 1px;
}

.extended-media__sort-btn {
  padding: 2px 12px;
}
.extended-media__sort-btn .q-icon {
  font-size: 15px;
  margin-right: 5px;
}
</style>

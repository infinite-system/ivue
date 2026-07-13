<script lang="ts">
// MediaFieldPreviewDialog — a QDialog lightbox over the field's media list.
//
// Derivations: 10 plain getters (0 bytes/instance) and 1 computed() —
// `isOpenModel`, a WRITABLE computed, which earns its ~300 bytes because a
// v-model target must be a stable ref handle with a setter.
import { computed, ref } from 'vue';

import { Reactive } from '../../../ivue';
import type { MediaField } from './MediaField';
import type { MediaItem } from './MediaFieldProps';

export interface MediaFieldPreviewDialogProps {
  /** The owning field instance — the dialog navigates ITS preview state. */
  field: MediaField.Instance;
  /** Dialog open state (v-model). */
  modelValue: boolean;
}

export interface MediaFieldPreviewDialogEmits {
  (event: 'update:modelValue', open: boolean): void;
}

class $MediaFieldPreviewDialog {
  constructor(
    public props: MediaFieldPreviewDialogProps,
    public emit: MediaFieldPreviewDialogEmits,
  ) {}

  // --- state ---
  get isImageLoading() {
    return ref(false);
  }
  get isMaximized() {
    return ref(false);
  }

  // --- derived ---
  get field() {
    return this.props.field;
  }
  get activeFile(): MediaItem | null {
    return this.field.activeFile;
  }
  get isActiveImage() {
    return !!this.activeFile && this.field.isImage(this.activeFile);
  }
  get hasMultiple() {
    return this.field.displayFiles.length > 1;
  }
  get positionLabel() {
    return `${this.field.previewIndex.value + 1} / ${this.field.displayFiles.length}`;
  }
  get activeSizeLabel() {
    return this.activeFile ? this.field.sizeLabel(this.activeFile) : '';
  }
  get activeExtension() {
    return this.activeFile ? this.field.fileExtension(this.activeFile) : '';
  }
  get isRenamingActive() {
    return (
      !!this.activeFile && this.field.renameId.value === this.activeFile.id
    );
  }

  beginRename() {
    if (this.activeFile) this.field.startRename(this.activeFile);
  }

  get maximizeIcon() {
    return this.isMaximized.value ? 'close_fullscreen' : 'open_in_full';
  }

  get isOpenModel() {
    return computed({
      get: () => this.isOpenValue(),
      set: (open: boolean) => this.setOpen(open),
    });
  }

  // --- methods ---

  isOpenValue() {
    return this.props.modelValue;
  }

  setOpen(open: boolean) {
    this.emit('update:modelValue', open);
  }

  close() {
    this.setOpen(false);
  }

  showPrev() {
    this.isImageLoading.value = true;
    this.field.prevPreview();
  }

  showNext() {
    this.isImageLoading.value = true;
    this.field.nextPreview();
  }

  onImageLoaded() {
    this.isImageLoading.value = false;
  }

  download() {
    if (this.activeFile) this.field.downloadFile(this.activeFile);
  }

  toggleMaximized() {
    this.isMaximized.value = !this.isMaximized.value;
  }
}

export namespace MediaFieldPreviewDialog {
  export const $Class = $MediaFieldPreviewDialog;
  export const Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
</script>

<script lang="ts" setup>
import { QBtn, QCard, QDialog, QIcon, QSpinner, QTooltip } from 'quasar';

const props = defineProps<MediaFieldPreviewDialogProps>();
const emit = defineEmits<MediaFieldPreviewDialogEmits>();

const dialog = new MediaFieldPreviewDialog.Class(props, emit);

// the field's rename draft drives the footer's inline editor
const { renameDraft } = props.field;

const {
  // state refs
  isImageLoading,
  isMaximized,
  // computed refs
  isOpenModel,
} = dialog;

defineExpose(dialog as MediaFieldPreviewDialog.Instance);
</script>

<template>
  <q-dialog
    v-model="isOpenModel"
    class="media-preview"
    :maximized="isMaximized"
    no-shake
  >
    <q-card
      class="media-preview__card"
      :class="{ 'media-preview__card--maximized': isMaximized }"
    >
      <!-- STAGE -->
      <div class="media-preview__stage" v-if="dialog.activeFile">
        <img
          v-if="dialog.isActiveImage"
          :key="dialog.activeFile.id"
          :src="dialog.activeFile.url"
          class="media-preview__image"
          @load="dialog.onImageLoaded()"
          @error="dialog.onImageLoaded()"
        />
        <div v-else class="media-preview__placeholder">
          <q-icon
            :name="dialog.field.fileIcon(dialog.activeFile)"
            size="72px"
            color="grey-5"
          />
          <div class="media-preview__placeholder-extension">
            {{ dialog.activeExtension }}
          </div>
        </div>
        <q-spinner
          v-if="isImageLoading"
          class="media-preview__spinner"
          color="white"
          size="42px"
          :thickness="3"
        />
      </div>

      <!-- FOOTER -->
      <div class="media-preview__footer" v-if="dialog.activeFile">
        <div class="media-preview__details">
          <div
            v-if="!dialog.isRenamingActive"
            class="media-preview__name"
            :class="{ 'media-preview__name--editable': dialog.field.canRename }"
            :title="dialog.activeFile.name"
            @click="dialog.beginRename()"
          >
            {{ dialog.activeFile.name }}
            <q-icon
              v-if="dialog.field.canRename"
              name="edit"
              size="14px"
              class="media-preview__name-edit"
            />
          </div>
          <input
            v-else
            class="media-preview__name-input"
            :value="renameDraft"
            autofocus
            @input="(event: any) => (renameDraft = event.target.value)"
            @keyup.enter="dialog.field.commitRename()"
            @keyup.esc="dialog.field.cancelRename()"
            @blur="dialog.field.commitRename()"
          />
          <div class="media-preview__meta">
            {{ dialog.activeExtension }} — {{ dialog.activeSizeLabel }}
          </div>
        </div>

        <div class="media-preview__controls">
          <q-btn
            v-if="dialog.field.canDownload"
            flat
            round
            icon="download"
            color="primary"
            @click="dialog.download()"
          >
            <q-tooltip class="bg-grey-9">Download</q-tooltip>
          </q-btn>

          <span v-if="dialog.hasMultiple" class="media-preview__position">
            {{ dialog.positionLabel }}
          </span>
          <q-btn
            v-if="dialog.hasMultiple"
            flat
            round
            icon="chevron_left"
            color="primary"
            @click="dialog.showPrev()"
          >
            <q-tooltip class="bg-grey-9">Previous</q-tooltip>
          </q-btn>
          <q-btn
            v-if="dialog.hasMultiple"
            flat
            round
            icon="chevron_right"
            color="primary"
            @click="dialog.showNext()"
          >
            <q-tooltip class="bg-grey-9">Next</q-tooltip>
          </q-btn>

          <q-btn
            flat
            round
            :icon="dialog.maximizeIcon"
            color="primary"
            @click="dialog.toggleMaximized()"
          >
            <q-tooltip class="bg-grey-9">
              {{ isMaximized ? 'Minimize' : 'Maximize' }}
            </q-tooltip>
          </q-btn>
          <q-btn flat round icon="check" color="primary" @click="dialog.close()">
            <q-tooltip class="bg-grey-9">Done</q-tooltip>
          </q-btn>
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.media-preview__card {
  width: 100%;
  max-width: 960px;
  display: flex;
  flex-direction: column;
}

.media-preview__card--maximized {
  max-width: 100%;
  height: 100%;
}

.media-preview__stage {
  position: relative;
  flex: 1 1 auto;
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(229deg, #000 0%, #020d18 50%, #000 100%);
}

.media-preview__image {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
}

.media-preview__card--maximized .media-preview__image {
  max-height: calc(100vh - 80px);
}

.media-preview__placeholder {
  text-align: center;
  padding: 48px 0;
}

.media-preview__placeholder-extension {
  color: #9e9e9e;
  font-size: 20px;
  letter-spacing: 2px;
  margin-top: 8px;
}

.media-preview__spinner {
  position: absolute;
  top: calc(50% - 21px);
  left: calc(50% - 21px);
}

.media-preview__footer {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 8px 8px 16px;
  border-top: 1px solid #eee;
  background: #fff;
}

.body--dark .media-preview__footer {
  background: #1a2032;
  border-top-color: rgba(255, 255, 255, 0.08);
}

.media-preview__details {
  min-width: 0;
}

.media-preview__name {
  font-size: 15px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #212121;
}

.body--dark .media-preview__name {
  color: #e8ecf8;
}

.media-preview__name--editable {
  cursor: pointer;
}
.media-preview__name-edit {
  opacity: 0.45;
  margin-left: 4px;
}
.media-preview__name-input {
  font-size: 15px;
  font-weight: 500;
  width: 100%;
  background: transparent;
  color: inherit;
  border: none;
  border-bottom: 1px solid currentColor;
  outline: none;
}

.media-preview__meta {
  font-size: 12px;
  color: #888;
}

.media-preview__controls {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
}

.media-preview__position {
  color: #999;
  font-size: 12px;
  letter-spacing: 1px;
  min-width: 48px;
  text-align: center;
  user-select: none;
}
</style>

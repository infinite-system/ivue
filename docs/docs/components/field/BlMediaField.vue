<script lang="ts">
import _isEmpty from 'lodash/isEmpty';
import {
  QUploader,
  QSpinner,
  QBadge,
  QBtn,
  QTooltip,
  QItem,
  QItemSection,
  QImg,
  QIcon,
  QUploaderAddTrigger,
  QItemLabel,
  QList,
} from 'quasar';

import BlMediaFieldClass, {
  type BlMediaFieldExposed,
} from '@/components/field/BlMediaFieldClass';
import { ivue } from 'ivue';

import { BlMediaFieldEmits, mediaFieldProps } from './BlMediaFieldProps';

/**
 * NOTE: This <script> section above the <script setup> is essential for
 * declaring the dynamic properties and emits properly
 * to be able to work in all modes, for example test mode
 * was not working without this.
 *
 * This is also a correct way according to the eslint rules.
 * @see https://eslint.vuejs.org/rules/valid-define-props.html
 *
 * IMPORTANT: Do not declare ref or reactive variables in this scope.
 */
</script>
<script lang="ts" setup>
const props = defineProps(mediaFieldProps);
const emit = defineEmits<BlMediaFieldEmits>();

/** Runner implementation: You can change the class that runs this component. */
const runner = (props?.runner || BlMediaFieldClass) as typeof BlMediaFieldClass;

/** IVUE Instance */
const media = ivue(runner, props, emit);

const { uploader, uploaderList, color, textColor, backgroundColor, maxHeight } =
  media.toRefs(
    [
      /** Refs */
      'uploader',
      'uploaderList',
      /** <style> CSS Variables */
      'color',
      'textColor',
      'backgroundColor',
      'maxHeight',
    ],
    true
  );
/** Expose properties */
defineExpose<BlMediaFieldExposed>(media);
emit('expose', media);
</script>
<template>
  <!-- DYNAMIC UPLOADER -->
  <component
    :is="media.runnerComponent"
    v-if="media.runnerComponent"
    :media="media"
  />
  <!-- QUASAR UPLOADER -->
  <div v-else :class="media.class">
    <q-uploader
      :ref="(qUploader: any) => uploader = qUploader"
      :factory="media.factory"
      :field-name="media.name"
      :disable="media.disable"
      :readonly="media.readonly"
      :multiple="media.multiple"
      :max-file-size="media.maxFileSize"
      :max-total-size="media.maxTotalSize"
      :max-files="media.maxFiles"
      :accept="media.accept"
      :batch="media.batch"
      :text-color="media.color"
      :auto-upload="media.autoUpload"
      :filter="(files) => media.filter(files)"
      @uploaded="(uploadedFiles) => media.onUploaded(uploadedFiles)"
      @factory-failed="(err: Error, files: readonly any[]) => media.onFactoryFailed(err, files)"
      @added="(addedFiles) => media.onAdded(addedFiles)"
      @removed="(removedFiles) => media.onRemoved(removedFiles)"
      @failed="(info) => media.onFailed(info)"
      @rejected="(rejectedFiles) => media.onRejected(rejectedFiles)"
      @start="() => media.onStart()"
      @finish="() => media.onFinish()"
    >
      <!-- QUASAR UPLOADER HEADER -->
      <template #header>
        <div
          class="media-field__header"
          :class="{ 'cursor-pointer': media.canAddFilesOnHeaderClick }"
          @click="(evt) => media.addFilesOnHeaderClick(evt)"
        >
          <q-spinner
            v-if="media.isUploading"
            size="18px"
            :thickness="2"
            class="q-mr-sm"
          />
          <!-- FIELD LABEL-->

          <div class="media-field__header-label">
            <div
              :class="{
                'media-field__header-label__minimized':
                  media.showMinimizedLabel,
              }"
              class="q-gutter-x-sm row items-center"
            >
              <span class="media-field__label">{{ media.label }}</span>

              <!-- LABEL TOTAL FILES-->
              <q-badge
                v-if="media.showTotalFilesCount"
                rounded
                color="grey-3"
                text-color="black"
                style="font-size: 10px"
                :style="
                  !media.showMinimizedLabel
                    ? 'padding: 2px 6px'
                    : 'padding: 0px 4px'
                "
                :label="media.totalFilesCount"
              />
            </div>

            <!-- TOTAL UPLOADED SIZE / PROGRESS % -->
            <div v-if="media.showProgress" class="media-field__header-subtitle">
              {{ media.uploadSizeLabel }} / {{ media.uploadProgressLabel }}
            </div>
          </div>

          <!-- CLEAR FILES BUTTON-->
          <q-btn
            v-if="media.hasQueuedFiles"
            icon="close"
            round
            dense
            size="11px"
            flat
            @click.stop="() => media.removeQueuedFiles()"
          >
            <q-tooltip
              anchor="top left"
              self="bottom middle"
              :offset="[20, 5]"
              class="bg-grey-7"
              >Clear {{ media.queuedFilesCount }} Queued Files</q-tooltip
            >
          </q-btn>

          <!-- ATTACH FILE BUTTON-->
          <div>
            <slot name="extra-buttons">
              <component
                :is="media.customButtonsComponent"
                v-if="media.customButtonsComponent"
                :media="media"
                v-bind="media.customButtonsComponentProps"
              />
            </slot>
            <q-btn
              v-if="media.canAddFiles && media.showAttachButton"
              icon="attach_file"
              size="11px"
              :class="media.uploadButtonClass"
              dense
              flat
              :round="!media.attachButtonLabel"
              :label="media.attachButtonLabel"
              @click.stop="(evt) => media.addFiles(evt)"
            >
              <q-uploader-add-trigger />
              <q-tooltip
                anchor="top middle"
                self="bottom middle"
                :offset="[0, 5]"
                class="bg-grey-7"
                >Attach Files</q-tooltip
              >
            </q-btn>
            <q-icon
              v-if="media.hasError"
              name="error"
              class="q-ml-sm"
              style="cursor: default"
              color="negative"
              size="24px"
              right
            />
          </div>
        </div>
      </template>

      <!-- QUASAR UPLOADER FILES -->
      <template #list>
        <div ref="uploaderList">
          <q-list class="q-px-xs q-pt-none q-pb-xs q-gutter-xs row">
            <!-- FILES -->
            <q-item
              v-for="(file, index) in media.allFiles"
              :key="file.__key"
              class="bg-white border-grey-4 rounded-borders"
              :class="{
                'q-pa-none': media.canSort,
                'q-py-none': !media.canSort,
                'q-px-xs': !media.canSort,
              }"
              :style="{
                maxWidth: !media.readonly ? 'auto' : '380px',
                width: '100%',
              }"
            >
              <template v-if="media.fileList[index]">
                <!-- SORTING BUTTONS -->
                <q-item-section v-if="media.canSort" side class="q-px-xs">
                  <q-btn
                    icon="arrow_upward"
                    flat
                    size="xs"
                    round
                    color="grey"
                    class="q-mb-xs"
                    @click="(e) => media.fileMoveUp(file, index)"
                  >
                    <q-tooltip
                      class="bg-grey-7"
                      anchor="top left"
                      self="top end"
                      :offset="[10, 0]"
                      >Move Up</q-tooltip
                    >
                  </q-btn>
                  <q-btn
                    icon="arrow_downward"
                    flat
                    size="xs"
                    round
                    color="grey"
                    @click="(e) => media.fileMoveDown(file, index)"
                    ><q-tooltip
                      class="bg-grey-7"
                      anchor="top left"
                      self="top end"
                      :offset="[10, 0]"
                      >Move Down</q-tooltip
                    >
                  </q-btn>
                </q-item-section>
                <!-- FILE IMAGE-->
                <q-item-section
                  class="q-my-xs rounded-borders bg-grey-2 text-center relative-position media-img"
                  style="max-width: 120px; height: 60px"
                >
                  <!-- IMAGE THUMBNAIL -->
                  <q-img
                    v-if="media.isFileImage(file)"
                    :src="media.getFilePlaceholderImageSource(file)"
                    class="full-width"
                    :ratio="16 / 9"
                    fit="contain"
                  >
                    <template #loading>
                      <q-spinner size="20px" :thickness="2" />
                    </template>
                    <template #error>
                      <img
                        class="full-width full-height"
                        :src="media.getFilePlaceholderImage()"
                      />
                    </template>
                  </q-img>
                  <!-- MEDIA EXTENSION -->
                  <div
                    v-else
                    class="text-uppercase text-grey text-condensed"
                    style="font-size: 24px"
                  >
                    {{ (file.extension ?? '').toUpperCase() }}
                  </div>
                  <!-- CLICK AREA - Can't be in item-section as it blocks the download button -->
                  <div
                    class="absolute-full"
                    :style="[media.canPreview ? 'cursor: pointer' : '']"
                    @click.prevent="
                      media.canPreview ? media.getFilePreview(index) : null
                    "
                  />
                  <!-- DOWNLOAD -->
                  <div class="absolute-bottom-right q-pa-xs">
                    <q-btn
                      v-if="media.canDownload && media.isFileUploaded(file)"
                      dense
                      unelevated
                      text-color="primary"
                      color="white"
                      padding="2px 4px"
                      style="border-radius: 3px"
                      size="10px"
                      icon="download"
                      :href="media.getFileDownloadUrl(file)"
                      ><q-tooltip class="bg-grey-7">Download</q-tooltip></q-btn
                    >
                  </div>
                </q-item-section>

                <!-- FILE DETAILS -->
                <q-item-section
                  class="q-my-xs column q-gutter-b-xs"
                  style="font-size: 12px"
                >
                  <!-- FILE NAME-->
                  <q-item-label
                    v-if="!media.canRename || file.__deleted__"
                    :title="file.$name"
                    :style="media.getFileLabelStyle(file)"
                  >
                    {{ file.$name }}
                  </q-item-label>
                  <input
                    v-else
                    v-model="file.$name"
                    placeholder="File Name"
                    type="text"
                    :class="{
                      'media-field__filename-input': true,
                      'media-field__filename-input-error':
                        media.fileErrors[file?.id ?? index],
                    }"
                    @keydown.enter="(e) => e.preventDefault()"
                    @input="media.validateFilename(file, index)"
                  />
                  <!-- FILE NAME ERROR -->
                  <div
                    v-if="media.fileErrors[file?.id ?? index]"
                    class="text-negative"
                  >
                    {{ media.fileErrors[file?.id ?? index] }}
                  </div>
                  <!-- FILE CAPTION-->
                  <q-item-label
                    v-if="
                      (!media.canRenameCaption && !_isEmpty(file.caption)) ||
                      (media.canRenameCaption && file.__deleted__)
                    "
                    class="text-grey"
                  >
                    {{ file.caption }}
                  </q-item-label>
                  <input
                    v-else-if="media.canRenameCaption"
                    v-model="file.caption"
                    :readonly="!!file.__deleted__"
                    placeholder="File Caption"
                    type="text"
                    class="media-field__filename-input media-field__filename-input-caption text-grey"
                    @keydown.enter="(e) => e.preventDefault()"
                  />

                  <!-- FILE SIZE / PROGRESS-->
                  <q-item-label caption class="row q-gutter-x-sm">
                    <q-badge
                      color="grey-3"
                      text-color="black"
                      class="text-uppercase text-condensed"
                      :label="file.extension"
                      style="font-size: 11px"
                    />
                    <div
                      class="text-uppercase text-condensed inline-block"
                      style="line-height: 16px"
                    >
                      {{ media.getFileSizeLabel(file) }}
                    </div>
                    <!-- STATUS ICON-->
                    <div
                      v-if="
                        !media.readonly &&
                        ['0%', '100%'].includes(
                          media.getFileProgressLabel(file)
                        )
                      "
                      class="row q-gutter-x-xs"
                    >
                      <!-- FILE STATUS ICON -->
                      <q-spinner
                        v-if="media.getFileStatus(file) === 'uploading'"
                        size="0.8em"
                        :color="media.getFileStatusIconColor(file)"
                        :thickness="2"
                      />
                      <q-icon
                        v-else
                        :name="media.getFileStatusIcon(file)"
                        :color="media.getFileStatusIconColor(file)"
                        style="
                          display: inline-block;
                          margin-top: 2px;
                          margin-left: 0;
                        "
                        size="12px"
                      />
                      <!-- FILE STATUS TEXT, COLOR & ERROR -->
                      <div
                        class="text-uppercase text-condensed"
                        :style="['color:' + media.getFileStatusColor(file)]"
                        style="line-height: 16px; font-size: 11px"
                      >
                        {{ media.getFileStatusText(file) }}
                      </div>
                      &nbsp;<span>{{ media.getFileErrorMessage(file) }}</span>
                    </div>
                    <div
                      v-if="
                        !['0%', '100%'].includes(
                          media.getFileProgressLabel(file)
                        )
                      "
                      class="text-uppercase text-condensed"
                    >
                      {{ media.getFileProgressLabel(file) }}
                    </div>
                  </q-item-label>
                </q-item-section>

                <!-- REMOVE FILE BUTTON -->
                <q-item-section style="padding: 5px" top side>
                  <div :class="media.canRemoveFileClass(file)">
                    <q-btn
                      v-if="media.canRemoveFile(file)"
                      size="10px"
                      flat
                      color="white"
                      text-color="gray-3"
                      round
                      margin="0"
                      icon="close"
                      @click="media.removeFile(file)"
                    >
                      <q-tooltip
                        class="bg-grey-7"
                        anchor="top left"
                        self="bottom middle"
                        :offset="[-5, 5]"
                        >Remove</q-tooltip
                      >
                    </q-btn>
                  </div>
                </q-item-section>
              </template>
            </q-item>
          </q-list>
        </div>
      </template>
    </q-uploader>

    <!-- ERROR MESSAGE -->
    <div
      v-if="media.hasError"
      :class="media.errorClass"
      v-html="media.errorMessage.join('<br />')"
    />
    <div v-else-if="media.hint" :class="media.hintClass">
      {{ media.hint }}
    </div>
  </div>
</template>
<style lang="scss">
.media-field {
  flex: 0 0 auto;

  /* Let it fill the entire space horizontally */
  .q-uploader {
    width: 100%;
    max-height: v-bind(maxHeight);
    box-shadow: none;
    background: transparent;
  }

  .media-field__header {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    font-size: 110%;
    padding: 15px 5px 15px 12px;

    .media-field__header-label {
      flex: 10000 1 0%;

      .media-field__header-label__minimized {
        font-size: 80%;
      }
    }

    .media-field__header-subtitle {
      font-size: 12px;
      line-height: 18px;
      color: #555;
    }
  }

  .q-uploader__header {
    background-color: transparent;

    .media-field__label {
      color: v-bind(textColor);
    }
  }

  .q-uploader__list {
    padding: 0;
    min-height: auto;
    border-top: 0;

    .media-field__filename-input {
      background: none;
      outline: none;
      border: 0;
      border-bottom: 1px solid transparent;
      line-height: 14px;
      transition: 0.3s;
      margin-bottom: 2px !important;

      &:hover {
        border-bottom: 1px solid #999;
      }

      &:focus {
        border-bottom: 1px solid v-bind(color);
      }
    }

    .media-field__filename-input-error {
      border-bottom: 1px solid var(--q-negative);
    }
  }

  &.media-field--filled {
    .q-uploader {
      background-color: v-bind(backgroundColor);
      transition: 0.3s;
      border: 1px solid rgba(0, 0, 0, 0.1);

      &:hover {
        border-bottom: 1px solid #858585;
      }
    }
  }

  &.media-field--dense {
    .media-field__header {
      font-size: 100%;
      padding-top: 7px;
      padding-bottom: 6px;
    }
  }

  &.media-field--outlined {
    .q-uploader__header {
      border: none;
      border-radius: 4px;
      transition: 0.5s;
    }
    .q-uploader__list {
      border-radius: 4px;
      transition: 0.5s;
    }
  }

  &.media-field--readonly {
    .media-field__label {
      color: #757575;
    }

    .q-uploader {
      border: 0;
      background: transparent;
    }

    .q-uploader:hover,
    .q-uploader:active {
      border: 0;
    }

    .q-uploader__list,
    .q-uploader__list:hover {
      border: 0;
    }
  }

  &.media-field__error {
    border-bottom-left-radius: 0 !important;
    border-bottom-right-radius: 0 !important;

    .q-uploader {
      border-bottom: 2px solid var(--q-negative);
    }

    .q-uploader:hover {
      border-bottom: 2px solid var(--q-negative);
    }

    .media-field__label {
      color: var(--q-negative);
    }
  }

  &.media-field--filled.media-field__error {
    .q-uploader {
      background: rgba(0, 0, 0, 0.15);
    }
  }

  &.media-field__border-bottom-0 {
    border-bottom: 0;
  }

  .q-item.media-field__item {
    cursor: default;
    padding-right: 10px;
    padding-left: 5px;
    transition: 0.5s;
  }

  .media-img {
    -webkit-box-shadow: inset 2px 0px 10px 5px #eee;
    box-shadow: inset 2px 0px 10px 5px #eee;
  }

  .media-field__item:hover {
    background: rgba(0, 0, 0, 0.03);

    .media-field__filename-input {
      border-bottom: 1px solid #ddd;
      margin-bottom: 2px !important;
    }

    .media-field__filename-input:hover {
      border-bottom: 1px solid #999;
    }

    .media-field__filename-input:focus {
      border-bottom: 1px solid #222;
    }

    .media-field__file-move-up {
      visibility: visible;
    }

    .media-field__file-move-down {
      visibility: visible;
    }
  }
}
</style>

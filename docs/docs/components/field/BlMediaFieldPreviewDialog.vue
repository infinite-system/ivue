<!-- eslint-disable @typescript-eslint/no-non-null-assertion -->
<script lang="ts" setup>
import {
  QInput,
  QTooltip,
  QDialog,
  QCard,
  QBtn,
  debounce,
  useDialogPluginComponent,
} from 'quasar';
import { ComputedRef, computed, nextTick, onMounted, ref } from 'vue';

import BlBtnSecondary from '@/components/button/BlBtnSecondary.vue';

import BlMediaFieldClass, { MediaFile } from './BlMediaFieldClass';

const emit = defineEmits([
  // REQUIRED; need to specify some events that your component will emit through useDialogPluginComponent()
  ...useDialogPluginComponent.emits,
]);
const { dialogRef, onDialogHide, /*onDialogOK,*/ onDialogCancel } =
  useDialogPluginComponent();
/* const submitSuccess = (data: any) => onDialogOK(data); */
const cancelClicked = () => {
  const scrollTop = media.uploaderList?.parentElement?.scrollTop;
  media.fileList[props.index] = false;
  nextTick(() => (media.fileList[props.index] = true));
  onDialogCancel();
};

const props = defineProps<{
  media: BlMediaFieldClass;
  index: number;
  setIndex: (index: number) => void;
}>();

/** PARENT MEDIA CLASS */
const media = props.media;

/** LOADING STATE */
const _loading = ref(true);
const loading = computed({
  get: () => _loading.value,
  set: debounce((val: boolean) => {
    _loading.value = val;
    // Debounced for images that load fast, not to show the loader
    // if loading takes less than the amount of milliseconds.
  }, 50),
});

/** MAXIMIZED STATE */
const maximized = ref(false);
const defaultMaxWidth = '1200px';
const maxWidth = ref(defaultMaxWidth);

function toggleMaximized() {
  maximized.value = !maximized.value;
  if (maximized.value) {
    maxWidth.value = '100%';
  } else {
    maxWidth.value = defaultMaxWidth;
  }
}

const previewHeight = computed(() => {
  return `${maximized.value ? 'calc(83.5vh)' : '70vh'} !important`;
});

/** FILE */
const file = computed(() => media.allFiles[props.index]);

const src = computed(() => {
  if (media.isFileImage(file.value)) {
    return media.getFilePlaceholderImageSource(file.value);
  } else {
    if (file.value instanceof File) {
      return URL.createObjectURL(file.value);
    } else {
      return media.getFileUrl(file.value);
    }
  }
});

const prevIndex: ComputedRef<number> = computed(() => {
  const fileCount = media.allFiles.length;
  let prevIndex = props.index - 1;
  if (prevIndex === -1) {
    prevIndex = fileCount - 1;
  }
  return prevIndex;
});

const nextIndex: ComputedRef<number> = computed(() => {
  const fileCount = media.allFiles.length;
  let nextIndex = props.index + 1;
  if (fileCount === nextIndex) {
    nextIndex = 0;
  }
  return nextIndex;
});

const prevFile: ComputedRef<MediaFile> = computed(
  () => media.allFiles[prevIndex.value]
);

const nextFile: ComputedRef<MediaFile> = computed(
  () => media.allFiles[nextIndex.value]
);

const isFileImage = computed(() => {
  return media.isFileImage(file.value);
});

const fileStats = computed(() => {
  const [size, unit] = media.getFileSizeLabel(file.value)?.split(' ');
  return {
    size: parseFloat(size).toFixed(1),
    unit,
  };
});

const downloadUrl = computed(() => {
  return media.canDownload &&
    media.isFileUploaded(file.value) &&
    file.value.$name
    ? media.getFileDownloadUrl(file.value)
    : undefined;
});

/** MOVEMENT NEXT / PREV */
function openPrevMedia() {
  loading.value = true;
  props.setIndex(prevIndex.value);
}

function openNextMedia() {
  loading.value = true;
  props.setIndex(nextIndex.value);
}

function removeFile() {
  const oldLength = media.allFiles.length;
  media.removeFile(file.value);
  if (oldLength - 1 === props.index) {
    props.setIndex(props.index - 1);
  }
  if (media.allFiles.length === 0) {
    dialogRef.value?.hide();
  }
}

const _fileCaption = ref(file.value.caption);
const fileCaption = computed({
  get: () => {
    return _fileCaption.value;
  },
  set: (value) => {
    file.value.caption = value;
    _fileCaption.value = value;
  },
});

const fileCaptionExists = computed(
  () => media.canRenameCaption || file.value.caption || false
);

/** LIFECYCLE */
onMounted(() => {
  if (media.canRename) {
    setTimeout(() => {
      filenameInput.value?.validate(file.value.$name);
    }, 17); // 17ms to match re-render speed
  }
});

const filenameInput = ref<QInput | null>(null);

const onFileLoadError = (evt: any) => {
  evt.target.src = media.getFilePlaceholderImage();
  loading.value = false;
};
</script>
<template>
  <q-dialog
    ref="dialogRef"
    class="media-field__preview"
    persistent
    no-shake
    @hide="onDialogHide"
  >
    <q-card class="full-width">
      <div class="media-field__preview__background">
        <div class="relative text-center media-field__preview__container">
          <!-- IMAGE -->
          <img
            v-if="isFileImage"
            :src="src"
            class="media-field__preview__image"
            :style="{ maxHeight: previewHeight }"
            @load="loading = false"
            @error="onFileLoadError"
          />
          <!-- PDF -->
          <iframe
            v-else
            class="full-width full-height media-field__preview__iframe"
            :src="src"
            :style="{ height: previewHeight }"
            @load="loading = false"
          />
          <!-- SPINNER -->
          <q-spinner
            v-if="loading"
            size="45px"
            :thickness="3"
            style="position: absolute; top: calc(50%); left: calc(50% - 20px)"
            color="white"
          />
          <div class="media-field__preview__blackline-logo-container" style="">
            <!-- BLACKLINE LOGO -->
            <img
              class="media-field__preview__blackline-logo-img"
              src="../../assets/logo-white.png"
            />
            <q-tooltip
              class="bg-black"
              transition-show="flip-up"
              transition-hide="fade"
              transition-duration="600"
              anchor="top left"
              self="top end"
              :offset="[10, 3]"
              ><div style="text-wrap: nowrap">
                Powered by <strong>Blackline</strong>
              </div></q-tooltip
            >
          </div>
        </div>
      </div>
      <div class="row media-field__preview__description">
        <div class="col-grow">
          <div class="row">
            <div
              class="q-pt-xs q-pl-md q-pb-none"
              :class="[fileCaptionExists ? 'col-6' : 'col-12']"
            >
              <!-- NAME -->
              <q-input
                ref="filenameInput"
                v-model="file.$name"
                placeholder="File Name"
                :readonly="!media.canRename"
                :class="[
                  'media-field__preview__input',
                  !media.canRename
                    ? 'media-field__preview__input--readonly'
                    : '',
                ]"
                dense
                no-error-icon
                :rules="[() => media.validateFilename(file, index)]"
              />
            </div>
            <div
              v-if="fileCaptionExists"
              class="col-6 q-mt-none q-pt-xs q-pl-md q-pb-sm"
              :class="
                $q.screen.sm || $q.screen.xs ? ['q-pr-md'] : ['q-pr-none']
              "
            >
              <!-- CAPTION -->
              <q-input
                v-model="fileCaption"
                :readonly="!media.canRenameCaption"
                :class="[
                  'media-field__preview__input media-field__preview__input-caption',
                  !media.canRenameCaption
                    ? 'media-field__preview__input--readonly'
                    : '',
                ]"
                dense
                :placeholder="media.canRenameCaption ? 'File Caption' : ''"
                type="text"
              />
            </div>
          </div>
        </div>
        <div
          class="text-right q-pa-sm"
          :class="
            $q.screen.sm || $q.screen.xs
              ? ['col-grow q-pl-md']
              : ['col-shrink q-pl-none']
          "
        >
          <!-- REMOVE -->
          <q-btn
            v-if="media.canRemoveFile(file)"
            icon="o_delete"
            flat
            color="primary"
            size="20px"
            padding="9px"
            @click="removeFile"
            ><q-tooltip
              class="bg-grey-10"
              anchor="bottom middle"
              self="center middle"
              :offset="[0, 30]"
              >Remove
            </q-tooltip></q-btn
          >

          <!-- DOWNLOAD BUTTON -->
          <BlBtnSecondary
            v-if="downloadUrl"
            flat
            class="q-ml-sm media-field__preview__download-button text-condensed"
            padding="8px 10px 7px 12px"
            icon="download"
            color="primary"
            :href="downloadUrl"
          >
            <div class="media-field__preview__download-button__extension">
              {{ file.extension.toUpperCase() }}
            </div>
            <div class="media-field__preview__download-button__filesize">
              {{ fileStats.size }}{{ fileStats.unit }}
            </div>
            <q-tooltip
              class="bg-grey-10"
              anchor="bottom middle"
              self="center middle"
              :offset="[0, 30]"
              >Download
              <strong>{{ file.$name }}.{{ file.extension }}</strong>
            </q-tooltip></BlBtnSecondary
          >

          <!-- POSITION -->
          <div
            v-if="media.allFiles.length > 1"
            class="q-ml-sm media-field__preview__position-map"
          >
            <strong>{{ index + 1 }}</strong> /
            <strong>{{ media.allFiles.length }}</strong>
          </div>
          <!-- PREV BUTTON -->
          <q-btn
            v-if="media.allFiles.length > 1"
            icon="chevron_left"
            flat
            size="22px"
            color="primary"
            padding="7px"
            class="q-ml-sm"
            @click="openPrevMedia"
            ><q-tooltip
              class="bg-grey-10"
              anchor="bottom right"
              self="center right"
              :offset="[0, 30]"
              >Previous: {{ prevIndex + 1 + '   &ndash;  ' }}
              <strong>{{ prevFile.$name + '.' + prevFile.extension }}</strong>
              {{ ' &ndash; ' + media.getFileSizeLabel(prevFile) }}</q-tooltip
            ></q-btn
          >
          <!-- NEXT BUTTON -->
          <q-btn
            v-if="media.allFiles.length > 1"
            icon="chevron_right"
            flat
            color="primary"
            size="22px"
            class="q-ml-xs"
            padding="7px 7px 7px 7px"
            @click="openNextMedia"
            ><q-tooltip
              class="bg-grey-10"
              anchor="bottom left"
              self="center left"
              :offset="[0, 30]"
              >Next: {{ nextIndex + 1 + ' &ndash; ' }}
              <strong>{{ nextFile.$name + '.' + nextFile.extension }} </strong
              >{{ ' &ndash; ' + media.getFileSizeLabel(nextFile) }}
            </q-tooltip></q-btn
          >

          <!-- MAXIMIZE BUTTON -->
          <q-btn
            flat
            :icon="maximized ? 'close_fullscreen' : 'open_in_full'"
            color="primary"
            class="q-ml-sm"
            size="14px"
            padding="10px 10px 10px 10px"
            @click="toggleMaximized"
            ><q-tooltip
              class="bg-grey-10"
              anchor="bottom middle"
              self="center middle"
              :offset="[0, 30]"
              >{{ maximized ? 'Minimize' : 'Maximize' }}</q-tooltip
            ></q-btn
          >
          <!-- DONE BUTTON -->
          <q-btn
            icon="check"
            color="primary"
            flat
            padding="9px"
            size="20px"
            class="q-ml-xs"
            @click="cancelClicked"
            ><q-tooltip
              class="bg-grey-10"
              anchor="bottom middle"
              self="center middle"
              :offset="[0, 30]"
              >Done</q-tooltip
            ></q-btn
          >
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>
<style>
.media-field__preview .q-dialog__inner--minimized > div {
  max-width: v-bind(maxWidth);
}

.media-field__preview__background {
  text-align: center;
  background: #000;
  transition: 0.5s;
}

.media-field__preview__container {
  position: relative;
  min-height: 100px;
  transition: 0.5s;
  background: linear-gradient(
    229deg,
    rgba(0, 0, 0, 1) 0%,
    rgba(2, 13, 24, 1) 25%,
    rgba(0, 17, 36, 1) 50%,
    rgba(2, 13, 24, 1) 75%,
    rgba(0, 0, 0, 1) 100%
  );
}

.media-field__preview__image {
  -webkit-box-shadow: 0px -60px 54px 7px #000000;
  box-shadow: 0px -60px 54px 7px #000000;
  display: inline-block;
  margin: 0;
  vertical-align: top;
  max-width: 100%;
}

.media-field__preview__iframe {
  display: inline-block;
  vertical-align: top;
}

.media-field__preview__description {
  border-top: 1px solid #eee;
}

.media-field__preview__input {
  border: 0;
  margin: 8px 0;
  width: 100%;
}

.media-field__preview__input {
  border: 0;
  padding: 0px 5px 0px 0px;
  font-size: 15px;
  font-weight: 500;
  line-height: 16px;
  display: block;
  transition: 0.3s;
  background: none;
}

.media-field__preview__input .q-field__control {
  height: 30px;
}

.media-field__preview__input .q-field__bottom {
  padding-top: 1px;
  min-height: auto;
}

.media-field__preview__input.media-field__preview__input--readonly,
.media-field__preview__input.media-field__preview__input--readonly:hover,
.media-field__preview__input.media-field__preview__input--readonly:focus {
  border: 0;
  cursor: default;
}

.media-field__preview__input-caption {
  color: #666;
  font-weight: 400;
  font-size: 15px;
  display: block;
  font-weight: 500;
  line-height: 16px;
  padding: 0px 5px 0px 0px;
}

.media-field__preview__input:focus {
  border-bottom: 1px solid #555;
}

.media-field__preview__input-caption.media-field__preview__input--readonly {
  padding-top: 0;
}

.media-field__preview__filesize {
  cursor: default;
  color: #999;
  padding: 10px;
  font-weight: 300;
  font-size: 12px;
  min-width: 55px;
  text-align: center;
}

.media-field__preview__download-button {
}

.media-field__preview__download-button .on-left {
  margin-right: 5px;
}

.media-field__preview__position-map {
  color: #999;
  min-width: 60px;
  text-align: center;
  display: inline-block;
  padding: 3px 7px 2px 7px;
  vertical-align: middle;
  font-size: 12px;
  user-select: none;
  cursor: default;
}

.media-field__preview__position-map strong {
  color: #555;
  font-weight: 400;
  letter-spacing: 1px;
}

.media-field__preview__blackline-logo-container {
  position: absolute;
  bottom: 15px;
  right: 20px;
  display: inline-block;
  vertical-align: top;
  margin: 0;
  transition: 0.6s;
  opacity: 0.3;
}

.media-field__preview__blackline-logo-container:hover {
  opacity: 1;
}

.media-field__preview__blackline-logo-container:active {
  opacity: 0.3;
}

.media-field__preview__blackline-logo-img {
  height: 20px;
  width: 20px;
}

.media-field__preview__download-button__extension {
  padding-left: 2px;
  display: inline-block;
  margin-top: -1px;
  letter-spacing: 0.5px;
  font-size: 16px;
  vertical-align: top;
}

.media-field__preview__download-button__filesize {
  display: inline-block;
  min-width: 70px;
  padding: 0 3px 0 6px;
  font-size: 13px;
  font-weight: 300;
  border-radius: 3px;
}
</style>

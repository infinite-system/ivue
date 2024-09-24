/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import _ from 'lodash';
import { useQuasar } from 'quasar';
import { Component, reactive, toRef, watch } from 'vue';

import { api } from '@/boot/axios';
import {
  BlMediaFieldEmits,
  BlMediaFieldProps,
  BlMediaFieldRefs,
} from '@/components/field/BlMediaFieldProps';
import useAuthentication from '@/composables/useAuthentication';
import BlacklineApi from '@/services/blackline_api.service';
import EnvironmentService from '@/services/environment.service';
import { asyncImport } from '@/utils/dynamicImport';
import { iref } from 'ivue';

import BlMediaFieldPreviewDialog from './BlMediaFieldPreviewDialog.vue';

/**
 * Database Media Model interface.
 */
export interface MediaModel {
  id: string;
  name: string;
  caption: string;
  key: string;
  thumbnail: string;
  mimetype: string;
  extension: string;
  size: number;
  other_data: Record<string, any>;
  status: number;
}

/**
 * Media file type for QUploader.
 */
export interface QUploaderFile {
  /** QUploader & JS File props */
  __key: string;
  __status: string;
  __uploaded: number;
  __progress: number;
  __sizeLabel: string;
  __progressLabel: string;
  __img: {
    src: string;
  };
  /* Custom Extended props */
  id?: string /** Media id */;
  key?: string /** Media key */;
  media?: MediaModel;
  $name?: string /** Media name without extension */;
  xhr?: any;
  __position__?: number;
  __saved__?: true;
  __deleted__?: true;
  [x: string]: any;
}

export type MediaFile = QUploaderFile & MediaModel;

/**
 * BlMediaField exposed types declaration.
 * @see BlMediaField component's defineExpose()
 */
export type BlMediaFieldExposed = Pick<
  BlMediaFieldClass,
  /* Data */
  | 'props'
  | 'label'
  | 'name'
  | 'fieldValue'
  | 'required'
  | 'valueChanged'
  | 'uploadProgressLabel'
  | 'isUploading'
  | 'isFinished'
  | 'totalFilesCount'
  | 'hasError'
  | 'errorMessage'
  /* Methods */
  | 'addFiles'
  | 'upload'
  | 'removeQueuedFiles'
  | 'removeUploadedFiles'
  | 'validate'
  | 'resetError'
  | 'setError'
  | 'resetField'
>;

export type BlMediaFieldValue = MediaFile | MediaFile[] | null | '' | undefined;

/**
 * Media Field for the Fields Mapper & EntityTable.
 * Supports multiple & single file upload.
 */
export default class BlMediaFieldClass {
  /** Quasar */
  $q = useQuasar();
  /** Refs */
  uploader = iref<BlMediaFieldRefs['uploader']>(null);

  uploaderList = iref<BlMediaFieldRefs['uploaderList']>(null);

  /** Value */
  modelValue: BlMediaFieldValue;

  localValue: BlMediaFieldValue;

  originalValue: BlMediaFieldValue;

  /** Runner Component */
  runnerComponent = iref<Component | false>(false);

  /**
   * Constructor Initializer.
   *
   * IVUE constructor().
   *
   * -- IMORTANT NOTICE --
   * IVUE constructor DOES NOT have access to the reactive state.
   * -- IMORTANT NOTICE --
   *
   * Inside the constructor() Ref props
   * are still to be accessed via .value
   *
   * Like this:
   * this.uploader.value
   * this.uploaderList.value
   * But in general they should not be accessed from here anyway,
   * but rather in the init() method.
   *
   * Reactive props without .value,
   * can be accessed inside the .init()
   * init() is called after the constructor() &
   * after the conversion of this class to a reactive Proxy.
   * @see {init}
   */
  constructor(public props: BlMediaFieldProps, public emit: BlMediaFieldEmits) {
    /**
     * Assign props to this class object props.
     * They need to be converted toRefs() first
     * to retain reactivity.
     */
    this.modelValue = toRef(
      props,
      'modelValue'
    ) as unknown as BlMediaFieldProps['modelValue'];
  }

  /** IVUE initializer method. */
  async init() {
    /**
     * IVUE init() MEMO (do not remove this from init() method):
     * Init method DOES have access to the reactive state.
     * Here you do not need to use .value to access
     * this objects' properties, all of which are
     * vue 3 reactive by now.
     */
    let initialized = false;

    if (this.props.runnerComponent) {
      this.runnerComponent = await asyncImport(this.props.runnerComponent);
    }

    if (this.props.customButtonsComponent) {
      this.customButtonsComponent = await asyncImport(
        this.props.customButtonsComponent
      );
    }

    /**
     * This watcher is made so that when modelValue changes,
     * the changes are reflected in the UI.
     */
    watch(
      () => this.modelValue,
      () => {
        this.localValue = this.initValue(
          this.props.multiple
            ? this.props.modelValue
            : /**
             * If initial data contains multiple items,
             * but we are in single mode, we reduce it to just 1 item.
             */
            _.isArray(this.props.modelValue) && this.props.modelValue.length
            ? this.props.modelValue.slice(0, 1)
            : this.props.modelValue
        );
        if (!initialized) {
          /**
           * Save the original value only once.
           */
          this.originalValue = _.cloneDeep(this.localValue);
        }
        initialized = true;
      },
      { immediate: true }
    );
  }

  /**
   * Initialize value for the media field.
   * @param value {BlMediaFieldValue}
   * @returns {MediaFile[]}
   */
  initValue(value: BlMediaFieldValue): MediaFile[] {
    if (Array.isArray(value)) {
      return value.map((f) =>
        /**
         * NOTE: This function will fire even on update:model-value emit,
         * We should not normalize instances of a File because they
         * are already normalized by the QUploader itself.
         */
        f instanceof File
          ? (f as any)
          : (this.self.normalizeMedia(_.cloneDeep(f)) as MediaFile)
      );
    } else {
      if (_.isEmpty(value)) {
        return [];
      } else {
        /**
         * NOTE: This function will fire even on update:model-value emit,
         * We should not normalize instances of a File because they
         * are already normalized by the QUploader itself.
         */
        return value instanceof File
          ? [value as any]
          : [this.self.normalizeMedia(_.cloneDeep(value) as MediaFile)];
      }
    }
  }

  showFileList = iref(true);

  /** Extra Buttons Component */
  customButtonsComponent = iref<Component | false>(false);

  get customButtonsComponentProps() {
    return this.props.customButtonsComponentProps;
  }

  get uploadButtonClass() {
    return {
      'q-px-sm': !!this.attachButtonLabel,
      'q-mr-xs': !this.attachButtonLabel,
      'q-ml-xs': !this.hasError,
    };
  }

  get attachButtonLabel() {
    return this.props.attachButtonLabel;
  }

  get showAttachButton() {
    return this.props.showAttachButton;
  }

  get api() {
    return api;
  }

  /**
   * QUploaderProps
   */
  // #region QUploaderProps
  get factory() {
    return this.props.serverless
      ? (files: any) => this.serverlessFactory(files)
      : (files: any) => this.serverFactory(files);
  }

  get required() {
    return this.props.required;
  }

  get name() {
    return this.props.name;
  }

  get label() {
    return this.props.label;
  }

  get disable() {
    return this.props.disable;
  }

  get readonly() {
    return this.props.readonly;
  }

  get filled() {
    return this.props.filled;
  }

  get dense() {
    return this.props.dense;
  }

  get outlined() {
    return this.props.outlined;
  }

  get multiple(): boolean {
    return this.props.multiple;
  }

  get maxFileSize(): number {
    return this.props.maxFileSize;
  }

  get maxTotalSize(): number {
    return this.props.maxTotalSize;
  }

  get maxFiles(): number {
    return this.props.maxFiles;
  }

  get accept(): string {
    return this.props.accept;
  }

  get batch() {
    return false;
  }

  get hint() {
    return this.props.hint;
  }

  get autoUpload(): boolean {
    return this.props.autoUpload;
  }

  get color() {
    return this.props.color;
  }

  get highlightChanges() {
    return this.valueChanged && this.props.highlightChanges;
  }

  get backgroundColor(): string {
    return this.highlightChanges
      ? this.props.backgroundHighlightColor
      : this.props.backgroundColor;
  }

  get textColor(): string {
    return this.props.textColor;
  }

  get class() {
    return {
      ['media-field q-field row   col-' + this.props.col]: true,
      [this.props?.class || '']: true,
      'media-field__error': this.hasError,
      'media-field__border-bottom-0': this.totalFilesCount === 0,
      ...this.classQuasarSpecific,
    };
  }
  // #endregion QUploaderProps

  get canSort(): boolean {
    return (
      this.multiple &&
      this.props.canSort &&
      !this.readonly &&
      this.allFiles.length > 1
    );
  }

  get canRename(): boolean {
    return !this.readonly && !this.disable && this.props.canRename;
  }

  get canRenameCaption(): boolean {
    return !this.readonly && !this.disable && this.props.canRenameCaption;
  }

  get canDownload(): boolean {
    return this.props.canDownload;
  }

  get canPreview(): boolean {
    return this.props.canPreview;
  }

  get forcedName(): boolean | string {
    return this.props.forcedName;
  }

  get errorClass() {
    return {
      ['media-field__error-text row col-' + this.props.col]: true,
      ...this.classQuasarSpecific,
    };
  }

  get hintClass() {
    return {
      'media-field__hint-text': true,
      ...this.classQuasarSpecific,
    };
  }

  get classQuasarSpecific() {
    return {
      'media-field--dense': this.dense,
      'media-field--filled': this.filled,
      'media-field--outlined': this.outlined,
      'media-field--readonly': this.readonly,
    };
  }

  get maxHeight() {
    return this.props.maxHeight;
  }

  /** Detect which files names & captions changed. */
  get changedData() {
    const originalValue = Array.isArray(this.originalValue)
      ? this.originalValue
      : this.originalValue
      ? [this.originalValue]
      : [];

    const changedData = [];
    for (let i = 0; i < this.fieldValue.length; i++) {
      const file = this.fieldValue[i];
      const ogValue = originalValue.find((f) => f.id === file.id);
      if (
        ogValue &&
        (file.caption !== ogValue.caption || file.$name !== ogValue.$name)
      ) {
        changedData.push({
          id: file.id,
          name: file.$name,
          caption: file.caption,
        });
      }
    }

    return changedData;
  }

  /**
   * Completely finished means, both isFinishedUploading
   * & isFinishedUpdatingData are finished.
   */
  isFinished = iref(true);

  isFinishedUploading = iref(false);
  isFinishedUpdatingData = iref(false);

  get isUploading() {
    return (
      this.uploader?.isUploading || this.uploader?.isBusy || !this.isFinished
    );
  }

  fileErrors = iref<Record<string, string>>({});

  /**
   * Launch media upload process.
   * @see useMedia.uploadMedia
   */
  async upload() {
    this.fileErrors = {};
    this.isFinishedUpdatingData = false;

    try {
      this.uploader?.upload();
      if (this.changedData.length) {
        await BlacklineApi.postCustom('/media/update', this.changedData);
      }
    } catch (err: any) {
      if (err?.name === 'validationError') {
        if (Array.isArray(err?.message?.errors)) {
          for (const e of err?.message?.errors) {
            if (typeof e.path === 'string') {
              const [bracketIndex] = e.path.split('.');
              const realIndex = bracketIndex.replaceAll(/[\[\]]/g, '');
              const fileId = this.changedData[realIndex].id;
              this.fileErrors[fileId] = e.msg;
            }
          }
        }
      }
      this.setError('Failed to update file names or captions.');
    } finally {
      this.isFinishedUpdatingData = true;

      if (this.isFinishedUploading) {
        /**
         * this.isFinished is also set in this.onFinish() function, because
         * this.uploader?.upload() is not an async function, we have
         * to do these extra checks for this.isFinishedUploading here,
         * and for this.isFinishedUpdatingData inside this.onFinish()
         * @see {BlMediaFieldClass.onFinish}
         */
        this.isFinished = true;
      }
    }
  }

  /** Change detection. */
  get valueChanged() {
    if (!this.uploader) return false;

    const originalValue =
      this.originalValue === null ||
      this.originalValue === '' ||
      this.originalValue === undefined
        ? []
        : this.originalValue;

    const currentValue = [...this.uploader.queuedFiles, ...this.fieldValue];

    // Uncomment the lines below to debug field changes.
    // console.log(`Media field ${this.name} changed:`,
    //   'originalValue:', originalValue,
    //   'currentValue:', currentValue,
    //   '!.isEqual:', !_.isEqual(originalValue, currentValue))
    return !_.isEqual(originalValue, currentValue);
  }

  /**
   * Convert to standard format of an array of MediaFile[]
   */
  get fieldValue(): MediaFile[] {
    if (!Array.isArray(this.localValue)) {
      this.localValue =
        this.localValue === null ||
        this.localValue === '' ||
        this.localValue === undefined
          ? []
          : [this.localValue];
    }
    return (this.localValue as any[]) || [];
  }

  /**
   * Set by converting to standard format of an array of {MediaFile[]}
   */
  set fieldValue(value: BlMediaFieldValue) {
    if (Array.isArray(value)) {
      this.localValue = value;
    } else if (value === null || value === '' || value === undefined) {
      this.localValue = [];
    } else {
      this.localValue = [value];
    }
  }

  /**
   * New model value converter.
   */
  get newModelValue() {
    if (!this.props.multiple) {
      return this.fieldValue?.[0] || {};
    } else {
      return this.fieldValue;
    }
  }

  // =================
  // Files
  // =================
  get totalFilesCount() {
    if (!this.uploader) return 0;
    return this.uploader.files.length + this.readyToSaveFilesCount;
  }

  get readyToSaveFilesCount() {
    return this.fieldValue.length;
  }

  get showProgress(): boolean {
    return (
      !!this.uploader &&
      !!(
        this.uploader.queuedFiles.length ||
        this.uploader.uploadedFiles.length ||
        this.uploader.files.length
      )
    );
  }

  get showMinimizedLabel(): boolean {
    return (
      !!this.uploader &&
      !!(
        this.uploader.queuedFiles.length ||
        this.uploader.uploadedFiles.length ||
        this.uploader.isUploading
      )
    );
  }

  get uploadSizeLabel() {
    return this.uploader?.uploadSizeLabel;
  }

  get uploadProgressLabel() {
    return this.uploader?.uploadProgressLabel;
  }

  removeQueuedFiles() {
    return this.uploader?.removeQueuedFiles();
  }

  removeUploadedFiles() {
    return this.uploader?.removeUploadedFiles();
  }

  get hasQueuedFiles(): boolean {
    return !!this.uploader?.queuedFiles.length || 0 > 0;
  }

  get queuedFilesCount(): number {
    return this.uploader?.queuedFiles.length ?? 0;
  }

  get showTotalFilesCount() {
    return this.totalFilesCount && this.props.multiple;
  }

  get canAddFiles(): boolean {
    if (!this.uploader || this.readonly || this.disable) return false;

    return (
      (this.props.multiple && this.uploader?.canAddFiles) ||
      (!this.props.multiple &&
        !this.uploader.isUploading &&
        this.uploader.uploadedFiles.length < 1 &&
        this.uploader.queuedFiles.length < 1 &&
        this.readyToSaveFilesCount <= 1)
    );
  }

  addFiles(evt: Event | null): void {
    if (this.canAddFiles) this.uploader?.pickFiles(evt as Event);
  }

  get canAddFilesOnHeaderClick() {
    return this.canAddFiles && this.props.canAddFilesOnHeaderClick;
  }

  addFilesOnHeaderClick(evt: Event | null): void {
    if (this.canAddFilesOnHeaderClick) this.addFiles(evt);
  }

  canRemoveFile(file: MediaFile): boolean {
    if (!this.uploader || this.readonly || this.disable) return false;

    return (
      this.props.multiple ||
      (!this.props.multiple && !('__saved__' in file)) ||
      (!this.props.multiple &&
        '__saved__' in file &&
        this.fieldValue.length === 1 &&
        this.uploader.files.length === 0)
    );
  }

  canRemoveFileClass(file: MediaFile): string {
    return this.canRemoveFile(file)
      ? 'media-field__remove-file-button-wrap'
      : 'media-field__remove-file-button-placeholder';
  }

  removeFile(file: any): void {
    const foundFile = this.fieldValue.findIndex(
      (el: any) => el.__key === file.__key
    );

    if (foundFile !== -1) {
      // Removes from saved & prepared for saving list of files
      this.fieldValue.splice(foundFile, 1);

      this.resetSingleFile();
    } else {
      // Removes from QUploader list of files
      this.uploader?.removeFile(file);
    }

    this.resetError();

    this.validate();

    this.emit('update:modelValue', this.newModelValue);
  }

  resetSingleFile(): void {
    if (!this.props.multiple) {
      if (this.fieldValue?.[0]) {
        /**
         * If there is image already uploaded
         * Remove the __deleted__ flag from the existing file.
         */
        delete this.fieldValue[0].__deleted__;
      }

      /**
       * Reset to default state of null when 0 files are selected,
       * That is the state from ObjectionJS initial data for single records.
       */
      if (!this.fieldValue.length) this.fieldValue = null;
    }
  }

  getFileStatus(file: MediaFile): string {
    return file.__status;
  }

  getFileStatusIcon(file: MediaFile): string {
    switch (true) {
      case file.__status === 'failed':
        return 'warning';
      case file.__status === 'idle':
        return 'upload';
      case file.__status === 'uploaded' && '__saved__' in file:
        return 'done_all';
      default:
        return 'checkmark';
    }
  }

  getFileStatusIconColor(file: MediaFile): string {
    switch (file.__status) {
      case 'failed':
        return 'red';
      case 'idle':
        return 'blue';
      case 'uploading':
        return 'black';
      default:
        return 'green';
    }
  }

  getFileStatusColor(file: MediaFile): string {
    switch (file.__status) {
      case 'failed':
        return 'red';
      case 'idle':
        return '#2196f3';
      case 'uploading':
        return 'black';
      default:
        return 'green';
    }
  }

  getFileStatusText(file: MediaFile): string {
    switch (true) {
      case file.__status === 'idle':
        return 'Ready';
      case file.__status === 'uploading':
        return 'Uploading...';
      case file.__status === 'uploaded' && '__saved__' in file:
        return 'Saved';
      default:
        return file.__status;
    }
  }

  getFileSizeLabel(file: MediaFile) {
    return file.__sizeLabel;
  }

  getFileProgressLabel(file: MediaFile) {
    return parseInt(file.__progressLabel) + '%';
  }

  getFileErrorMessage(file: MediaFile): string {
    let msg = '';
    try {
      if (file.xhr && file.xhr.status !== 200) {
        const response =
          typeof file.xhr.response === 'string'
            ? JSON.parse(file.xhr.response)
            : file.xhr.response;
        msg = response?.clientMessage || response?.message;
      }
    } catch (e) {}
    return msg;
  }

  getFileUrl(file: MediaFile) {
    return EnvironmentService.server + '/media/file/' + file.key;
  }

  getFileDownloadUrl(file: MediaFile) {
    return (
      this.getFileUrl(file) +
      '?download=true&name=' +
      encodeURIComponent(file?.$name as string) +
      '.' +
      file.extension
    );
  }

  isFileUploaded(file: MediaFile): boolean {
    return file.__status === 'uploaded';
  }

  getFilePreview(index: number): void {
    const componentProps = reactive({
      index,
      media: this,
      setIndex(index: number) {
        dialog.update({ index });
      },
    });

    const dialog = this.$q.dialog({
      component: BlMediaFieldPreviewDialog,
      componentProps,
    });
  }

  fileMoveUp(file: MediaFile | QUploaderFile, index: number) {
    this.fileMoveUpExistingFile(file, index);
    this.fileMoveUpQueuedFile(file, index);
    this.emit('update:modelValue', this.newModelValue);
  }

  fileMoveDown(file: MediaFile | QUploaderFile, index: number) {
    this.fileMoveDownExistingFile(file, index);
    this.fileMoveDownQueuedFile(file, index);
    this.emit('update:modelValue', this.newModelValue);
  }

  private fileMoveUpExistingFile(
    file: MediaFile | QUploaderFile,
    index: number
  ) {
    const realIndex = index - (this.uploader?.files.length ?? 0);
    const previousIndex = realIndex - 1;
    const previousFile = this.fieldValue?.[previousIndex];
    if (previousFile) {
      if (file.key && previousFile.key) {
        const currentFile = this.fieldValue.slice(realIndex, realIndex + 1);
        this.fieldValue.splice(realIndex, 1);
        this.fieldValue.splice(previousIndex, 0, ...currentFile);
      }
    }
  }

  private fileMoveUpQueuedFile(file: MediaFile | QUploaderFile, index: number) {
    const realIndex = index;
    const previousIndex = realIndex - 1;
    const previousFile = this.uploader?.files?.[previousIndex];
    if (previousFile) {
      if (file.__key && previousFile.__key) {
        const currentFile = (this.uploader?.files as any[]).slice(
          realIndex,
          realIndex + 1
        );
        (this.uploader?.files as any[]).splice(realIndex, 1);
        (this.uploader?.files as any[]).splice(
          previousIndex,
          0,
          ...currentFile
        );
        let position = 0;
        this.uploader!.files.forEach((file: any) => {
          file.__position__ = position++;
        });
      }
    }
  }

  private fileMoveDownExistingFile(
    file: MediaFile | QUploaderFile,
    index: number
  ) {
    const realIndex = index - (this.uploader?.files.length ?? 0);
    const nextIndex = realIndex + 1;
    const nextFile = this.fieldValue?.[nextIndex];
    if (nextFile) {
      if (file.key && nextFile.key) {
        const currentFile = this.fieldValue.slice(realIndex, nextIndex);
        this.fieldValue.splice(realIndex, 1);
        this.fieldValue.splice(nextIndex, 0, ...currentFile);
      }
    }
  }

  private fileMoveDownQueuedFile(
    file: MediaFile | QUploaderFile,
    index: number
  ) {
    const realIndex = index;
    const nextIndex = realIndex + 1;
    const nextFile = this.uploader?.files?.[nextIndex];
    if (nextFile) {
      if (file.__key && nextFile.__key) {
        const currentFile = (this.uploader!.files as any[]).slice(
          realIndex,
          nextIndex
        );
        (this.uploader!.files as any[]).splice(realIndex, 1);
        (this.uploader!.files as any[]).splice(nextIndex, 0, ...currentFile);
        let position = 0;
        this.uploader!.files.forEach((file: any) => {
          file.__position__ = position++;
        });
      }
    }
  }

  isFileImage(file: any): boolean {
    return (
      (file.__img && !('mimetype' in file)) ||
      (file.__img &&
        'mimetype' in file &&
        String(file.mimetype).startsWith('image/'))
    );
  }

  getFileExtension(file: MediaFile) {
    return (
      file.extension ?? file.__key.split('.').pop()?.replaceAll(/\d+$/g, '')
    );
  }

  getFilePlaceholderImage() {
    return '/assets/placeholder/image.svg';
  }

  getFilePlaceholderImageSource(file: MediaFile) {
    return file.__img.src;
  }

  getFileLabelStyle(file: MediaFile) {
    return { textDecoration: file?.__deleted__ ? 'line-through' : 'none' };
  }

  /**
   * Validate filename RegExp.
   *
   * Will prevent filenames with
   * Windows not allowed characters:
   *
   * < (less than)
   * > (greater than)
   * : (colon)
   * “ (double quote)
   * / (forward slash)
   * \ (backslash)
   * | (vertical bar or pipe)
   * ? (question mark)
   * * (asterisk)
   *
   * And MacOS not allowed characters:
   *
   * : (colon)
   * / (forward slash)
   * Also will prevent filenames starting with a space or a dot.
   */
  validFilenameRegExp = /^(?!^[ .])(?!.*[/\\:*?"<>|])(?![. ]+$)[^/\\:*?"<>|]+$/;

  validateFilename(file: MediaFile, index: number) {
    let msg: boolean | string = true;
    if (!this.validFilenameRegExp.exec(file?.$name as string)) {
      msg = 'Invalid file name';
      this.fileErrors[file?.id ?? index] = msg;
    } else {
      delete this.fileErrors[file?.id ?? index];
    }

    if (_.size(this.fileErrors) === 0) {
      // Reset errors if there are no file errors
      this.resetError();
    }
    return msg;
  }

  /** Helps refresh individual items on non-reactive File caption change. */
  fileList: Record<number, boolean> = iref({});

  /**
   * Merges selected files via QUploader with
   * the stored files in fieldValue
   */
  get allFiles(): MediaFile[] {
    this.fileList = {};
    const selectedFiles = (this.uploader?.files as any[]) || [];

    selectedFiles.forEach((file, index) => {
      if ('xhr' in file && 'response' in file.xhr) {
        if (file.xhr.status === 200) {
          /**
           * Get uploaded file AWS urls.
           */
          let uploadedFiles: string[];
          if (this.props.serverless) {
            uploadedFiles =
              this.uploader?.uploadedFiles.map(
                (uploaded: MediaFile) => uploaded.key
              ) || [];
          } else {
            uploadedFiles =
              JSON.parse(file.xhr.response)?.data?.uploaded?.map(
                (uploaded: MediaFile) => uploaded.key
              ) || [];
          }

          const found = this.fieldValue.findIndex((existing: MediaFile) =>
            uploadedFiles.includes(existing.key as string)
          );

          if (found !== -1) {
            selectedFiles.splice(index, 1); // Necessary to not show duplicates in the files list
            (this.uploader?.uploadedFiles as any[]).pop(); // Necessary for single uploads to flush uploaded file.
          }
        }
      }
    });

    return selectedFiles.concat(this.fieldValue).map((file, index) => {
      this.fileList[index] = true;
      return file;
    });
  }

  // =================
  // Factories
  // =================

  /**
   * Server factory upload that is processed
   * through our application server.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  serverFactory(files: any): Record<string, any> {
    const { token } = useAuthentication();
    return {
      url: `${EnvironmentService.server}/media/upload`,
      method: 'POST',
      headers: [{ name: 'Authorization', value: 'Bearer ' + token.value }],
      formFields: (files: any) => [
        { name: 'name', value: files[0].name },
        { name: 'caption', value: files[0].caption },
        { name: 'status', value: this.props.activateMedia ? 1 : 0 },
      ],
    };
  }

  /**
   * Upload via AWS serverless signed upload url.
   * Files must be processed one at a time.
   * To run serverless factory batch mode
   * for QUploader must be turned off.
   * <q-uploader :batch="false">
   *
   * @param files {File}
   */
  serverlessFactory(files: any): Promise<Record<string, any>> {
    return new Promise(async (resolve, reject) => {
      try {
        /**
         * Create an AWS signed upload url for each file.
         */
        let { data } = await this.api.post('media/sign-upload', {
          mimetype: files[0].type,
          name: files[0].name,
          size: files[0].size,
          caption: files[0].caption,
          status: this.props.activateMedia ? 1 : 0,
        });

        data = data.data;

        files[0].media = data.media;
        files[0].id = data.media.id;
        files[0].key = data.media.key;

        /**
         * Upload to the signed AWS url.
         */
        resolve({
          url: data.uploadUrl,
          method: 'PUT',
          sendRaw: true,
        });
      } catch (e: any) {
        reject(e);
      }
    });
  }

  // =================
  // Files Sorting
  // =================
  /**
   * Sorting is necessary because the files are uploaded via
   * :batch="false" mode or concurrently.
   *
   * This function prepares files for the after
   * non-sequential upload sorting.
   *
   * @private
   */
  sortFilesBeforeUpload(addedFiles: any[]): void {
    let maxPosition = 0;
    this.uploader?.queuedFiles.forEach((f: any) => {
      if ((f?.__position__ || 0) > maxPosition) {
        maxPosition = f.__position__;
      }
    });
    let position = maxPosition + 1;
    addedFiles.forEach((file: any) => (file.__position__ = position++));
  }

  /**
   * Sorting is necessary because the files are uploaded via
   * :batch="false" mode or concurrently.
   *
   * @private
   */
  sortFilesAfterUpload(): void {
    const uploadedFiles: any[] = [];

    this.fieldValue.forEach((file: any) => {
      if ('__position__' in file) {
        uploadedFiles.push(file);
      }
    });

    this.fieldValue = this.fieldValue.filter(
      (file: any) => !uploadedFiles.find((uf) => uf.__key === file.__key)
    );

    uploadedFiles.sort((a, b) => a.__position__ - b.__position__);

    uploadedFiles.forEach((file) => {
      file.__saved__ = true;
      delete file.__position__;
    });

    this.fieldValue = uploadedFiles.concat(this.fieldValue);

    this.emit('update:modelValue', this.newModelValue);
  }

  private makeNameAndCaptionEditable(addedFiles: any): void {
    /**
     * Add writable properties, that can be modified.
     * Like name and caption for the file object.
     */
    for (const [index, file] of addedFiles.entries()) {
      /** Add caption property. */
      file.caption = '';

      let fileName = file.name;

      /** Force filename when forcedName is used for transaction document
       *  ONLY works for ONE file, hence check for index
       */
      if (index === 0 && this.forcedName) {
        fileName = this.forcedName;
      }

      file.extension = fileName.split('.').pop();

      /** Get filename without extension. */
      file.$name = this.self.stripFileExtension(fileName);

      /**
       * Default file.name property comes from
       * JavaScript File class object and is not writable.
       * To work around that we redefine the property
       * to have a setter as well as the getter.
       */
      Object.defineProperty(file, 'name', {
        get: () => file.$name + '.' + file.extension,
        set: (value) => (file.$name = this.self.stripFileExtension(value)),
      });
    }

    if (!this.props.multiple) {
      if (this.fieldValue?.[0]) {
        /**
         * If there is image already uploaded
         * Mark it as DELETED, but still show it
         */
        this.fieldValue[0].__deleted__ = true;
      }
    }
  }
  // =================
  // Callbacks
  // =================

  onFactoryFailed(error: any, files: readonly any[]) {
    /** Add errors to queued files list. */
    for (const file of files) {
      file.xhr = {
        status: error.response.status,
        response: error.response.data,
      };
    }
    const err = error.response.data;
    this.resetError();
    if (err?.name === 'validationError') {
      this.setError('Failed to upload files due to validation errors.');
    } else {
      this.setError(['Failed to upload files.', err]);
    }
  }

  onAdded(addedFiles: any): void {
    this.makeNameAndCaptionEditable(addedFiles);

    this.sortFilesBeforeUpload(addedFiles);

    /* Scroll file list to top */
    this.uploaderList?.parentElement?.scroll({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });

    this.resetError();

    this.validate();

    this.emit('update:modelValue', this.newModelValue);
  }

  onUploaded(uploadedFiles: any): void {
    let files: any[] = [];
    if (this.props.serverless) {
      files = uploadedFiles.files;
    } else {
      files = JSON.parse(uploadedFiles.xhr.response)?.data?.uploaded || [];
      /** Match file order positions. */
      files.forEach((file) => {
        const foundCurrentFile = uploadedFiles.files.find(
          (uf: any) =>
            uf.name === file.name + '.' + file.extension &&
            uf.size === file.size &&
            uf.caption === file.caption
        );
        if (foundCurrentFile) {
          file.__position__ = foundCurrentFile.__position__;
        }
      });
    }

    files.forEach((file: any) => {
      this.fieldValue.unshift(this.self.normalizeMedia(file));
    });

    this.emit('update:modelValue', this.newModelValue);
  }

  onRemoved(removedFiles: any): void {
    if (!this.props.multiple) {
      this.resetSingleFile();
      // Remove file from uploadedFiles list
      (this.uploader?.uploadedFiles as any[]).pop();
    }

    // Remove file from fieldValue
    if (_.isArray(this.fieldValue)) {
      this.fieldValue.filter(
        (f: any) => !removedFiles.find((rf: any) => rf.__key === f.__key)
      );
    }

    this.resetError();

    this.validate();

    // Update model
    this.emit('update:modelValue', this.newModelValue);
  }

  onRejected(rejectedFiles: any[]) {
    const msg = [];
    let maxFileSizeMsg = '',
      maxFilesMsg = '';

    rejectedFiles.forEach((failed: any) => {
      if (failed.failedPropValidation === 'max-file-size') {
        maxFileSizeMsg =
          'Max file size is ' +
          this.self.formatBytes(this.props.maxFileSize, 2);
      }

      if (['max-files', 'filter'].includes(failed.failedPropValidation)) {
        maxFilesMsg = 'Max number of files is ' + this.props.maxFiles;
      }

      switch (failed.failedPropValidation) {
        case 'max-file-size':
          msg.push(`${failed.file.name} is too large.`);
          break;
        case 'max-files':
        case 'filter':
          msg.push(`${failed.file.name} could not be added.`);
          break;
        case 'duplicate':
          msg.push(`${failed.file.name} was already added.`);
          break;
        default:
          msg.push(
            `${failed.file.name} ${failed.failedPropValidation} validation failed.`
          );
      }
    });

    if (maxFileSizeMsg) msg.push(maxFileSizeMsg);
    if (maxFilesMsg) msg.push(maxFilesMsg);

    this.setError(msg);

    this.$q.notify({
      type: 'negative',
      html: true,
      message: `${msg.join('<br />')}`,
    });
  }

  onFailed(info: {
    /**
     * Files which encountered error
     */
    files: readonly any[];
    /**
     * XMLHttpRequest that has been used to upload this batch of files
     */
    xhr: any;
  }): void {
    info.files.forEach((file: any) => {
      const msg = 'Failed to upload ' + file.name + '.\n';

      this.setError(msg);
    });
  }

  onStart(): void {
    this.resetError();
    this.isFinished = false;
    this.isFinishedUploading = false;
  }

  onFinish(): void {
    this.sortFilesAfterUpload();
    this.isFinishedUploading = true;
    if (this.isFinishedUpdatingData) {
      /**
       * this.isFinished is also set in this.upload() function, because
       * this.uploader?.upload() is not an async function, we have
       * to do these extra checks for this.isFinishedUpdatingData here,
       * and for this.isFinishedUploading inside this.upload()
       * @see {BlMediaFieldClass.upload}
       */
      this.isFinished = true;
    }
  }

  // =================
  // Validation
  // =================
  filter(files: any): any[] {
    // There is no max filtering for single files:
    // So we just return all files as they are.
    if (!this.props.multiple) return files;

    // But for multiples there is minFiles/maxFiles that can be set,
    // And we need to check that we fall within the range, otherwise
    // we filter out the extras and leave only the allowed amount of files added.
    const queuedFiles =
      this.readyToSaveFilesCount + (this.uploader?.queuedFiles.length || 0);
    const newFiles = files.length;
    const totalFilesCount = queuedFiles + newFiles;

    let filesToAdd = files.length;
    if (totalFilesCount >= this.props.maxFiles) {
      if (queuedFiles >= this.props.maxFiles) {
        return [];
      } else if (queuedFiles < this.props.maxFiles) {
        filesToAdd = this.props.maxFiles - queuedFiles;
      }
    }

    const result = files.filter((f: any, index: number) => index < filesToAdd);

    return result;
  }

  validateMinimumFiles() {
    if (this.props.required && this.totalFilesCount < this.props.minFiles) {
      this.setError(
        `${this.props.label || this.props.name} requires ${
          this.props.minFiles
        } file(s) minimum.`
      );
    }
    if (
      !this.props.required &&
      this.totalFilesCount < this.props.minFiles &&
      this.totalFilesCount !== 0
    ) {
      this.setError(
        `${
          this.props.label || this.props.name
        } requires either no files supplied or ${
          this.props.minFiles
        } file(s) minimum, if supplied.`
      );
    }
  }

  validateMaximumFiles(): void {
    if (this.totalFilesCount > this.props.maxFiles) {
      this.setError(
        `${this.props.label || this.props.name} allows ${
          this.props.maxFiles
        } file(s) maximum.`
      );
    }
  }

  validateFilenames(): void {
    let index = 0;
    for (const file of this.allFiles) {
      this.validateFilename(file, index);
      index++;
    }
    if (_.size(this.fileErrors)) {
      this.setError('Some of the file names are invalid.');
    }
  }

  validate(): void {
    this.resetError();
    this.validateFilenames();
    this.validateMinimumFiles();
    this.validateMaximumFiles();
  }

  // =================
  // Errors
  // =================
  errorMessage = iref<string[]>([]);

  get hasError(): boolean {
    return this.errorMessage.length > 0;
  }

  setError(error: string | string[]): void {
    if (Array.isArray(error)) {
      this.errorMessage.concat(error);
    } else {
      this.errorMessage.push(error);
    }
  }

  resetError(): void {
    this.errorMessage = [];
    this.fileErrors = {};
  }

  // =================
  // Reset
  // =================
  async resetField(): Promise<void> {
    this.fieldValue = _.cloneDeep(this.originalValue);

    this.fieldValue.forEach((f) => this.self.normalizeMedia(f));

    this.resetError();
  }

  // =================
  // Static Access
  // =================

  static ivue = {
    self: false,
    api: false,
  };

  /**
   * Shortcut to access the static
   * constructor of current class.
   */
  get self() {
    return this.constructor as typeof BlMediaFieldClass;
  }

  /**
   * Normalize Media to match QUploader file object format.
   *
   * @param media
   * @returns
   */
  static normalizeMedia(media: MediaFile) {
    const props: QUploaderFile = {
      /* File definition */
      id: media.id,
      key: media.key,
      $name: media.name,
      extension: media.extension,
      name: media.name,
      __key: media.key,
      __status: 'uploaded',
      __uploaded: media.size,
      __progress: 1,
      __sizeLabel: this.formatBytes(media.size),
      __progressLabel: '100.00%',
      __img: {
        src: EnvironmentService.server + '/media/file/' + media.key,
      },
      /* Extended definition */
      __saved__: true,
    };

    Object.assign(media, props);
    return media as MediaModel & MediaFile;
  }

  /**
   * Strip file extension from filename.
   * @param filename string
   * @returns Stripped filename string
   */
  static stripFileExtension(filename: string): string {
    const fileParts = filename.split('.');
    fileParts.pop();
    return fileParts.join('.');
  }

  /**
   * Pretty print file size.
   *
   * @param bytes number
   * @param decimals number
   * @returns string
   */
  static formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0B';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }
}

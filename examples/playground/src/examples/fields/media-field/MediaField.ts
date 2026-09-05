// MediaField.ts — the Advanced Media Uploader engine class.
//
// Derivation budget: 28 PLAIN getters (0 bytes/instance, reactive via leaf
// tracking) and 0 computed() in this class. No derivation here is expensive
// enough to earn the ~300 bytes/instance a computed costs — each one is a
// cheap expression over already-cached state or props. The one computed
// that DOES earn it lives in ExtendedMediaField (a whole-list sort, cached
// so a render doesn't re-sort per read).

import type { ExtractPropTypes, PropType } from 'vue';
import { ref, watch } from 'vue';

import {
  type ExtendSlots,
  type ExtractEmitTypes,
  type ExtractPropDefaultTypes,
  definePropTypes,
  propsWithDefaults,
  Reactive,
} from '../../../ivue';
import { Static } from '../../../Static';
import type { MediaRow } from '../server/ServerApi';
import { ServerApi } from '../server/ServerApi';

export class $MediaField {
  /* Contract — STATIC. Types and defaults are declared separately so a
     subclass can re-default without re-typing; `props` fuses them
     through the receiver (object/array defaults become factories). */

  /** Params Types */
  static get propsTypes() {
    return definePropTypes({
      modelValue: {
        type: [Object, Array, String] as PropType<MediaField.Model>,
      },
      multiple: { type: Boolean as PropType<boolean> },
      /** Comma-separated accept list — extensions (`.pdf`) and mime patterns (`image/*`). */
      accept: { type: String as PropType<string> },
      maxFiles: { type: Number as PropType<number> },
      /** Per-file limit in bytes. */
      maxFileSize: { type: Number as PropType<number> },
      label: { type: String as PropType<string> },
      hint: { type: String as PropType<string> },
      readonly: { type: Boolean as PropType<boolean> },
      disable: { type: Boolean as PropType<boolean> },
      dense: { type: Boolean as PropType<boolean> },
      /** Preview grid tile size in pixels. */
      thumbnailSize: { type: Number as PropType<number> },
      canPreview: { type: Boolean as PropType<boolean> },
      canDownload: { type: Boolean as PropType<boolean> },
      canRename: { type: Boolean as PropType<boolean> },
      canRenameCaption: { type: Boolean as PropType<boolean> },
      canRemove: { type: Boolean as PropType<boolean> },
      /**
       * Runner implementation — pass a subclass's `Class` to swap the logic
       * that drives the component (the class-extension showcase).
       * @see ExtendedMediaField.vue
       */
      runner: { type: Function as PropType<any> },
    });
  }

  /** Params Defaults */
  static get propsDefaults(): ExtractPropDefaultTypes<
    typeof $MediaField.propsTypes
  > {
    return {
      modelValue: null,
      multiple: false,
      accept: '.pdf, image/*',
      maxFiles: 12,
      maxFileSize: 100 * 1024 * 1024, // 100 MB
      label: 'Media',
      hint: '',
      readonly: false,
      disable: false,
      dense: false,
      thumbnailSize: 132,
      canPreview: true,
      canDownload: true,
      canRename: true,
      canRenameCaption: true,
      canRemove: true,
      runner: null,
    };
  }

  static get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }

  /** Emits */
  static get emits() {
    return {
      'update:modelValue': (value: MediaField.Model) => true,
      uploaded: (rows: MediaField.Item[]) => true,
      removed: (row: MediaField.Item) => true,
      error: (message: string) => true,
    };
  }

  constructor(
    public props: MediaField.Props,
    public emit: MediaField.Emits,
  ) {
    watch(
      () => this.props.modelValue,
      (value) => this.hydrateModel(value),
      { immediate: true },
    );
  }

  // --- state ---
  get files() {
    return ref<MediaField.Item[]>([]);
  }
  get isUploading() {
    return ref(false);
  }
  get uploadingCount() {
    return ref(0);
  }
  get isHydrating() {
    return ref(false);
  }
  get isDragOver() {
    return ref(false);
  }
  get errorMessage() {
    return ref<string | null>(null);
  }
  get renameId() {
    return ref<string | null>(null);
  }
  get renameDraft() {
    return ref('');
  }
  get previewOpen() {
    return ref(false);
  }
  get previewIndex() {
    return ref(0);
  }
  get fileInput() {
    return ref<HTMLInputElement | null>(null);
  }

  // --- props ---
  get multiple() {
    return this.props.multiple;
  }
  get accept() {
    return this.props.accept;
  }
  get maxFileSize() {
    return this.props.maxFileSize;
  }
  get label() {
    return this.props.label;
  }
  get hint() {
    return this.props.hint;
  }
  get readonly() {
    return this.props.readonly;
  }
  get disable() {
    return this.props.disable;
  }
  get dense() {
    return this.props.dense;
  }
  get canPreview() {
    return this.props.canPreview;
  }
  get canDownload() {
    return this.props.canDownload;
  }
  get canRename() {
    return this.props.canRename && this.isInteractive;
  }
  get canRenameCaption() {
    return this.props.canRenameCaption && this.isInteractive;
  }
  get canRemove() {
    return this.props.canRemove && this.isInteractive;
  }

  // --- derived ---
  get canSort() {
    return this.multiple && this.isInteractive && this.files.value.length > 1;
  }
  get dragIndex() {
    return ref<number | null>(null);
  }

  get isInteractive() {
    return !this.props.readonly && !this.props.disable;
  }
  get maxFiles() {
    return this.multiple ? this.props.maxFiles : 1;
  }
  get remainingSlots() {
    return Math.max(0, this.maxFiles - this.files.value.length);
  }
  get canAddMore() {
    return this.isInteractive && this.remainingSlots > 0;
  }
  get hasFiles() {
    return this.files.value.length > 0;
  }
  get fileCountLabel() {
    return `${this.files.value.length} / ${this.maxFiles}`;
  }

  /** The list the template renders — subclasses override to reorder. */
  get displayFiles(): MediaField.Item[] {
    return this.files.value;
  }

  get acceptedTypesText() {
    return this.acceptTokens.join(', ');
  }
  get acceptTokens() {
    return this.accept
      .split(',')
      .map((token) => token.trim().toLowerCase())
      .filter(Boolean);
  }
  get maxFileSizeLabel() {
    return this.formatBytes(this.maxFileSize, 0);
  }
  get dropHint() {
    return this.multiple
      ? 'Drop files here or click to browse'
      : 'Drop a file here or click to browse';
  }
  get uploadProgressLabel() {
    const count = this.uploadingCount.value;
    return `Uploading ${count} file${count === 1 ? '' : 's'}…`;
  }
  get thumbnailStyle() {
    return { width: this.props.thumbnailSize + 'px' };
  }
  get activeFile(): MediaField.Item | null {
    return this.displayFiles[this.previewIndex.value] ?? null;
  }
  get hasError() {
    return !!this.errorMessage.value;
  }

  // --- model hydration & emission ---

  /** Bare ids in the model are fetched; rows are used as-is. Echoes of our own emit are skipped by id-comparison. */
  async hydrateModel(value: MediaField.Model | undefined) {
    const entries =
      value == null || value === ''
        ? []
        : Array.isArray(value)
          ? value
          : [value];
    const limited = this.multiple ? entries : entries.slice(0, 1);
    const ids = limited.map((entry) =>
      typeof entry === 'string' ? entry : entry.id,
    );

    if (ids.join(',') === this.files.value.map((row) => row.id).join(','))
      return;

    const missingIds = limited.filter(
      (entry): entry is string => typeof entry === 'string',
    );
    const fetchedRows = new Map<string, MediaField.Item>();
    if (missingIds.length) {
      this.isHydrating.value = true;
      try {
        for (const row of await ServerApi.media.get(missingIds)) {
          fetchedRows.set(row.id, row);
        }
      } catch {
        this.setError('Failed to load existing media.');
      } finally {
        this.isHydrating.value = false;
      }
    }

    const rows: MediaField.Item[] = [];
    for (const entry of limited) {
      if (typeof entry === 'string') {
        const fetched = fetchedRows.get(entry);
        if (fetched) rows.push(fetched);
      } else {
        rows.push(entry);
      }
    }
    this.files.value = rows;
    this.onFilesLoaded(rows);
  }

  /** Hook for subclasses — runs after hydration replaces the list. */
  onFilesLoaded(rows: MediaField.Item[]) {}

  moveFile(fromIndex: number, toIndex: number) {
    const list = this.files.value;
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= list.length ||
      toIndex >= list.length
    ) {
      return;
    }
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    this.files.value = [...list];
    this.emitModel();
  }

  fileMoveUp(index: number) {
    this.moveFile(index, index - 1);
  }

  fileMoveDown(index: number) {
    this.moveFile(index, index + 1);
  }

  onRowDragStart(index: number) {
    this.dragIndex.value = index;
  }

  onRowDrop(index: number) {
    if (this.dragIndex.value !== null) {
      this.moveFile(this.dragIndex.value, index);
    }
    this.dragIndex.value = null;
  }

  emitModel() {
    const rows = this.files.value;
    this.emit(
      'update:modelValue',
      this.multiple ? [...rows] : (rows[0] ?? null),
    );
  }

  // --- picking & drag-drop ---

  pickFiles() {
    if (this.canAddMore) this.fileInput.value?.click();
  }

  onFilesPicked(event: Event) {
    const input = event.target as HTMLInputElement;
    const pickedFiles = Array.from(input.files ?? []);
    input.value = '';
    void this.uploadFiles(pickedFiles);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (this.canAddMore) this.isDragOver.value = true;
  }

  onDragLeave() {
    this.isDragOver.value = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.value = false;
    if (!this.canAddMore) return;
    void this.uploadFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  // --- upload ---

  async uploadFiles(pickedFiles: File[]) {
    this.clearError();
    const acceptedFiles = this.validateFiles(pickedFiles);
    if (!acceptedFiles.length) return;

    this.isUploading.value = true;
    this.uploadingCount.value = acceptedFiles.length;
    try {
      const rows = await ServerApi.media.upload(acceptedFiles);
      this.onUploaded(rows);
    } catch {
      this.setError('Upload failed.');
    } finally {
      this.isUploading.value = false;
      this.uploadingCount.value = 0;
    }
  }

  /** Hook for subclasses — appends the uploaded rows and reports them. */
  onUploaded(rows: MediaField.Item[]) {
    this.files.value.push(...rows);
    this.emitModel();
    this.emit('uploaded', rows);
  }

  /** Filters by accept list, size limit, and remaining slots; reports every rejection. */
  validateFiles(pickedFiles: File[]): File[] {
    const problems: string[] = [];
    const acceptedFiles: File[] = [];

    for (const file of pickedFiles) {
      if (!this.isAccepted(file)) {
        problems.push(`${file.name} is not an accepted type.`);
      } else if (file.size > this.maxFileSize) {
        problems.push(
          `${file.name} exceeds the ${this.maxFileSizeLabel} limit.`,
        );
      } else {
        acceptedFiles.push(file);
      }
    }

    if (acceptedFiles.length > this.remainingSlots) {
      problems.push(`Only ${this.maxFiles} file(s) allowed.`);
      acceptedFiles.length = this.remainingSlots;
    }
    if (problems.length) this.setError(problems.join(' '));

    return acceptedFiles;
  }

  isAccepted(file: File): boolean {
    if (!this.acceptTokens.length) return true;
    const fileName = file.name.toLowerCase();
    const mimetype = file.type.toLowerCase();
    return this.acceptTokens.some((token) => {
      if (token.startsWith('.')) return fileName.endsWith(token);
      if (token.endsWith('/*')) return mimetype.startsWith(token.slice(0, -1));
      return mimetype === token;
    });
  }

  // --- remove / rename / download ---

  async removeFile(row: MediaField.Item) {
    if (!this.canRemove) return;
    try {
      await ServerApi.media.remove(row.id);
    } catch {
      this.setError(`Failed to remove ${row.name}.`);
      return;
    }
    const foundIndex = this.files.value.findIndex(
      (existing) => existing.id === row.id,
    );
    if (foundIndex !== -1) this.files.value.splice(foundIndex, 1);

    if (this.previewIndex.value >= this.files.value.length) {
      this.previewIndex.value = Math.max(0, this.files.value.length - 1);
    }
    if (!this.hasFiles) this.previewOpen.value = false;

    this.emitModel();
    this.emit('removed', row);
  }

  startRename(row: MediaField.Item) {
    if (!this.canRename) return;
    this.renameId.value = row.id;
    this.renameDraft.value = this.baseName(row.name);
  }

  async commitRename() {
    const renameId = this.renameId.value;
    const row = this.files.value.find((existing) => existing.id === renameId);
    if (!row) return this.cancelRename();

    const draft = this.renameDraft.value.trim();
    if (!draft || !this.validFilenameRegExp.test(draft)) {
      this.setError('Invalid file name.');
      return;
    }
    const extension = this.extensionOf(row.name);
    const newName = extension ? `${draft}.${extension}` : draft;
    try {
      await ServerApi.media.update({ id: row.id, name: newName });
      row.name = newName;
      this.clearError();
      this.emitModel();
    } catch {
      this.setError(`Failed to rename ${row.name}.`);
    }
    this.renameId.value = null;
  }

  cancelRename() {
    this.renameId.value = null;
  }

  downloadFile(row: MediaField.Item) {
    const anchor = document.createElement('a');
    anchor.href = row.url;
    anchor.download = row.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  // --- preview navigation ---

  openPreview(index: number) {
    if (!this.canPreview) return;
    this.previewIndex.value = index;
    this.previewOpen.value = true;
  }

  closePreview() {
    this.previewOpen.value = false;
  }

  nextPreview() {
    const count = this.displayFiles.length;
    if (count) this.previewIndex.value = (this.previewIndex.value + 1) % count;
  }

  prevPreview() {
    const count = this.displayFiles.length;
    if (count) {
      this.previewIndex.value = (this.previewIndex.value - 1 + count) % count;
    }
  }

  // --- per-row helpers ---

  isImage(row: MediaField.Item): boolean {
    return row.mimetype.startsWith('image/');
  }

  fileExtension(row: MediaField.Item): string {
    return this.extensionOf(row.name).toUpperCase();
  }

  fileIcon(row: MediaField.Item): string {
    if (row.mimetype === 'application/pdf') return 'picture_as_pdf';
    if (row.mimetype.startsWith('video/')) return 'movie';
    if (row.mimetype.startsWith('audio/')) return 'audiotrack';
    return 'insert_drive_file';
  }

  sizeLabel(row: MediaField.Item): string {
    return this.formatBytes(row.size);
  }

  baseName(filename: string): string {
    const dotIndex = filename.lastIndexOf('.');
    return dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
  }

  extensionOf(filename: string): string {
    const dotIndex = filename.lastIndexOf('.');
    return dotIndex > 0 ? filename.slice(dotIndex + 1) : '';
  }

  formatBytes(bytes: number, decimals = 1): string {
    if (!+bytes) return '0 B';
    const kilobyte = 1024;
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const unitIndex = Math.min(
      units.length - 1,
      Math.floor(Math.log(bytes) / Math.log(kilobyte)),
    );
    const amount = bytes / Math.pow(kilobyte, unitIndex);
    return `${parseFloat(amount.toFixed(decimals))} ${units[unitIndex]}`;
  }

  // --- errors ---

  setError(message: string) {
    this.errorMessage.value = message;
    this.emit('error', message);
  }

  clearError() {
    this.errorMessage.value = null;
  }

  /** Rejects Windows/macOS-forbidden characters and leading dots/spaces. */
  validFilenameRegExp = /^(?!^[ .])(?!.*[/\\:*?"<>|])(?![. ]+$)[^/\\:*?"<>|]+$/;
}

export namespace MediaField {
  /* Identity */

  export const $Class = Static($MediaField); // anchor — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance;

  /* Types — DERIVED from the class's statics, never hand-duplicated */

  export type Props = ExtractPropTypes<typeof $Class.props>;
  export type Emits = ExtractEmitTypes<typeof $Class.emits>;

  /** A media row plus the client-editable caption. */
  export type Item = MediaRow & { caption?: string };

  /**
   * The model accepts rows, bare ids, or a mix — ids are hydrated through
   * `ServerApi.media.get`. Single mode holds one entry (or null), multiple
   * mode holds an array.
   */
  export type Model =
    | Item
    | string
    | Array<Item | string>
    | null;

  /**
   * Slot props. `field` is typed loose on purpose: the runner prop can swap
   * in ANY MediaField subclass, and injected templates call the subclass's
   * extra members (see ExtendedMediaField.vue).
   */
  export interface SlotProps {
    field: any;
  }
  export interface ItemSlotProps extends SlotProps {
    row: Item;
    index: number;
  }

  /**
   * Base slots — ExtendSlots wraps every one with `before--` & `after--`
   * variants, the template-injection mechanism extended components use.
   */
  export type Slots = ExtendSlots<{
    header(slotProps: SlotProps): any;
    empty(slotProps: SlotProps): any;
    item(slotProps: ItemSlotProps): any;
    'item-actions'(slotProps: ItemSlotProps): any;
  }>;
}

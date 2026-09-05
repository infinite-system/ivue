// ExtendedMediaField.ts — the class-extension showcase.
//
// Extends MediaField.$Class (the RAW class — the namespace convention's
// whole point) and adds: sort-by-name/date toggle, image dimensions read
// via createImageBitmap and shown as a badge, a caption editor, copy-URL
// with feedback, and a total-size summary.
//
// Derivation budget: 7 plain getters (0 bytes/instance) and 1 computed() —
// `sortedFiles`. That one earns its ~300 bytes: it re-sorts the WHOLE list,
// and `displayFiles` is read many times per render (once per grid item
// binding), so the cached cell suppresses the repeated O(n log n) work.

import { computed, ref } from 'vue';

import { Reactive } from '../../../ivue';
import { ServerApi } from '../server/ServerApi';
import { MediaField } from './MediaField';


export type MediaSortMode = 'newest' | 'name';

export class $ExtendedMediaField extends MediaField.$Class {
  // --- state ---
  get sortMode() {
    return ref<MediaSortMode>('newest');
  }
  get captionId() {
    return ref<string | null>(null);
  }
  get captionDraft() {
    return ref('');
  }
  get copiedId() {
    return ref<string | null>(null);
  }
  get imageDimensions() {
    return ref<Record<string, string>>({});
  }

  // --- derived ---
  get sortedFiles() {
    return computed(() => this.sortFiles());
  }
  override get displayFiles(): MediaField.Item[] {
    return this.sortedFiles.value;
  }
  get sortModeLabel() {
    return this.sortMode.value === 'newest' ? 'Newest first' : 'By name';
  }
  get sortModeIcon() {
    return this.sortMode.value === 'newest' ? 'schedule' : 'sort_by_alpha';
  }
  get totalSize() {
    return this.files.value.reduce((sum, row) => sum + row.size, 0);
  }
  get totalSizeLabel() {
    return this.formatBytes(this.totalSize);
  }
  /** Square tile edge — the grid styles v-bind it. */
  get tileSize() {
    return `${this.props.thumbnailSize}px`;
  }

  // --- per-row template conditions (named — no logic in the template) ---

  isCaptioning(row: MediaField.Item) {
    return this.captionId.value === row.id;
  }

  isCopied(row: MediaField.Item) {
    return this.copiedId.value === row.id;
  }

  copyIcon(row: MediaField.Item) {
    return this.isCopied(row) ? 'check' : 'link';
  }

  copyLabel(row: MediaField.Item) {
    return this.isCopied(row) ? 'Copied!' : 'Copy URL';
  }

  // --- sorting ---

  sortFiles(): MediaField.Item[] {
    const rows = [...this.files.value];
    if (this.sortMode.value === 'name') {
      return rows.sort((left, right) => left.name.localeCompare(right.name));
    }
    return rows.sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }

  toggleSortMode() {
    this.sortMode.value = this.sortMode.value === 'newest' ? 'name' : 'newest';
  }

  // --- image dimensions (read on upload AND on hydration) ---

  override onUploaded(rows: MediaField.Item[]) {
    super.onUploaded(rows);
    rows.forEach((row) => void this.measureImage(row));
  }

  override onFilesLoaded(rows: MediaField.Item[]) {
    super.onFilesLoaded(rows);
    rows.forEach((row) => void this.measureImage(row));
  }

  async measureImage(row: MediaField.Item) {
    if (!this.isImage(row) || this.imageDimensions.value[row.id]) return;
    try {
      const blob = await (await fetch(row.url)).blob();
      const bitmap = await createImageBitmap(blob);
      this.imageDimensions.value[row.id] = `${bitmap.width}×${bitmap.height}`;
      bitmap.close();
    } catch {
      /* Non-decodable image — no badge for this row. */
    }
  }

  dimensionsOf(row: MediaField.Item): string {
    return this.imageDimensions.value[row.id] ?? '';
  }

  // --- copy URL ---

  async copyUrl(row: MediaField.Item) {
    await navigator.clipboard.writeText(row.url);
    this.copiedId.value = row.id;
    window.setTimeout(() => this.clearCopied(row.id), 1500);
  }

  clearCopied(rowId: string) {
    if (this.copiedId.value === rowId) this.copiedId.value = null;
  }

  // --- caption editor ---

  startCaption(row: MediaField.Item) {
    if (!this.canRenameCaption) return;
    this.captionId.value = row.id;
    this.captionDraft.value = row.caption ?? '';
  }

  async commitCaption() {
    const captionId = this.captionId.value;
    const row = this.files.value.find((existing) => existing.id === captionId);
    if (!row) return this.cancelCaption();

    const caption = this.captionDraft.value.trim();
    try {
      await ServerApi.media.update({ id: row.id, caption });
      row.caption = caption;
      this.emitModel();
    } catch {
      this.setError(`Failed to update caption for ${row.name}.`);
    }
    this.captionId.value = null;
  }

  cancelCaption() {
    this.captionId.value = null;
  }
}

export namespace ExtendedMediaField {
  /* Identity */

  export const $Class = $ExtendedMediaField;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  /* Types — the contract IS the base field's (inherited statics): the
     subclass adds behavior and slot templates, not props. Aliased here
     so consumers read ExtendedMediaField.* and never reach into the
     base's files. */

  export type Props = MediaField.Props;
  export type Emits = MediaField.Emits;
  export type Slots = MediaField.Slots;
}

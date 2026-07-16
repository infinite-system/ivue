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
import type { MediaItem } from './MediaFieldProps';

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
  override get displayFiles(): MediaItem[] {
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

  // --- sorting ---

  sortFiles(): MediaItem[] {
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

  override onUploaded(rows: MediaItem[]) {
    super.onUploaded(rows);
    rows.forEach((row) => void this.measureImage(row));
  }

  override onFilesLoaded(rows: MediaItem[]) {
    super.onFilesLoaded(rows);
    rows.forEach((row) => void this.measureImage(row));
  }

  async measureImage(row: MediaItem) {
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

  dimensionsOf(row: MediaItem): string {
    return this.imageDimensions.value[row.id] ?? '';
  }

  // --- copy URL ---

  async copyUrl(row: MediaItem) {
    await navigator.clipboard.writeText(row.url);
    this.copiedId.value = row.id;
    window.setTimeout(() => this.clearCopied(row.id), 1500);
  }

  clearCopied(rowId: string) {
    if (this.copiedId.value === rowId) this.copiedId.value = null;
  }

  // --- caption editor ---

  startCaption(row: MediaItem) {
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
  export const $Class = $ExtendedMediaField;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}

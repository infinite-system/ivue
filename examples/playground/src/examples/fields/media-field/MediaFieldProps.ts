// MediaFieldProps.ts — the params-types + params-defaults architecture.
//
// Types and defaults are declared as two separate literals so a child
// component (or app) can spread-and-extend either one, then
// `propsWithDefaults` fuses them into a defineComponent()-style props
// object. Emits are object-declared and extracted with ExtractEmitTypes;
// slots gain automatic `before--`/`after--` extension points via ExtendSlots.

import type { ExtractPropTypes, PropType } from 'vue';

import {
  propsWithDefaults,
  type ExtractEmitTypes,
  type ExtractPropDefaultTypes,
  type ExtendSlots,
} from '../../../ivue';
import type { MediaRow } from '../server/ServerApi';

/** A media row plus the client-editable caption. */
export type MediaItem = MediaRow & { caption?: string };

/**
 * The model accepts rows, bare ids, or a mix — ids are hydrated through
 * `ServerApi.media.get`. Single mode holds one entry (or null), multiple
 * mode holds an array.
 */
export type MediaFieldModel =
  | MediaItem
  | string
  | Array<MediaItem | string>
  | null;

/** Params Types */
export const mediaFieldParamsTypes = {
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
};

/** Params Defaults */
export const mediaFieldParamsDefaults: ExtractPropDefaultTypes<
  typeof mediaFieldParamsTypes
> = {
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

/** Generated Params */
export const mediaFieldParams = propsWithDefaults(
  mediaFieldParamsDefaults,
  mediaFieldParamsTypes,
);
export type MediaFieldParams = ExtractPropTypes<typeof mediaFieldParams>;

/** Props */
export const mediaFieldProps = {
  modelValue: {
    type: [Object, Array, String] as PropType<MediaFieldModel>,
    default: null,
  },
  ...mediaFieldParams,
};
export type MediaFieldProps = ExtractPropTypes<typeof mediaFieldProps>;

/** Emits */
export const mediaFieldEmits = {
  'update:modelValue': (value: MediaFieldModel) => true,
  uploaded: (rows: MediaItem[]) => true,
  removed: (row: MediaItem) => true,
  error: (message: string) => true,
};
export type MediaFieldEmits = ExtractEmitTypes<typeof mediaFieldEmits>;

/**
 * Slot props. `field` is typed loose on purpose: the runner prop can swap
 * in ANY MediaField subclass, and injected templates call the subclass's
 * extra members (see ExtendedMediaField.vue).
 */
export interface MediaFieldSlotProps {
  field: any;
}
export interface MediaFieldItemSlotProps extends MediaFieldSlotProps {
  row: MediaItem;
  index: number;
}

/**
 * Base slots — ExtendSlots wraps every one with `before--` & `after--`
 * variants, the template-injection mechanism extended components use.
 */
export type MediaFieldSlots = ExtendSlots<{
  header(slotProps: MediaFieldSlotProps): any;
  empty(slotProps: MediaFieldSlotProps): any;
  item(slotProps: MediaFieldItemSlotProps): any;
  'item-actions'(slotProps: MediaFieldItemSlotProps): any;
}>;

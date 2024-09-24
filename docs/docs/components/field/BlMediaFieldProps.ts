import { QUploader } from 'quasar';
import { ExtractPropTypes, PropType } from 'vue';

import { baseFieldProps } from '@/composables/field/defaultFieldProps';
import { ExtractPropDefaultTypes, propsWithDefaults } from 'ivue';

import BlMediaFieldClass, { BlMediaFieldExposed } from './BlMediaFieldClass';

/** Params Types */
export const mediaFieldParamsTypes = {
  canAddFilesOnHeaderClick: { type: Boolean as PropType<boolean> },
  showAttachButton: { type: Boolean as PropType<boolean> },
  attachButtonLabel: { type: String as PropType<string> },
  customButtonsComponent: {
    type: [Boolean, String] as PropType<string | boolean>,
  },
  customButtonsComponentProps: { type: Object as PropType<Record<string, any>> },
  textColor: { type: String as PropType<string> },
  backgroundColor: { type: String as PropType<string> },
  backgroundHighlightColor: { type: String as PropType<string> },
  maxFileSize: { type: Number as PropType<number> },
  maxTotalSize: { type: Number as PropType<number> },
  minFiles: { type: Number as PropType<number> },
  maxFiles: { type: Number as PropType<number> },
  maxHeight: { type: String as PropType<string | 'auto'> },
  autoUpload: { type: Boolean as PropType<boolean> },
  multiple: { type: Boolean as PropType<boolean> },
  accept: { type: String as PropType<string> },
  serverless: { type: Boolean as PropType<boolean> },
  activateMedia: { type: Boolean as PropType<boolean> },
  canSort: { type: Boolean as PropType<boolean> },
  canRename: { type: Boolean as PropType<boolean> },
  canRenameCaption: { type: Boolean as PropType<boolean> },
  forcedName: { type: [Boolean, String] as PropType<boolean | string> },
  canDownload: { type: Boolean as PropType<boolean> },
  canPreview: { type: Boolean as PropType<boolean> },
  runner: { type: [Object, Function] as PropType<typeof BlMediaFieldClass> },
  runnerComponent: { type: [Boolean, String] as PropType<string | boolean> },
};

/** Params Defaults */
export const mediaFieldParamsDefaults: ExtractPropDefaultTypes<
  typeof mediaFieldParamsTypes
> = {
  canAddFilesOnHeaderClick: true, // Set to false to disable heading click file upload
  showAttachButton: true, // If using customButtonsComponent, setting this to false can hide the original button
  attachButtonLabel: '', // You can add a label to the attach button
  customButtonsComponent: false, // Specify custom component as a string path, it will be resolved dynamically
  customButtonsComponentProps: {}, // Props that will pass into custom buttons component
  textColor: 'rgba(0, 0, 0, 0.87)',
  backgroundColor: 'rgba(0,0,0,0.02)',
  backgroundHighlightColor: '#F0F4C3',
  maxFileSize: 100 * 1024 * 1024, // 100MB
  maxTotalSize: 1000 * 1024 * 1024, // 1GB
  minFiles: 1 /** The default for this MUST always be 1 if using single file upload `multiple: false` */,
  maxFiles: 100,
  maxHeight: '320px' /* Set to 'auto' to have no height limit */,
  /**
   * autoUpload: true will upload files on select / drop.
   */
  autoUpload: false,
  multiple: false,
  accept: '.pdf, image/*',
  /**
   * serverless: false will use our server to upload to AWS.
   */
  serverless: true,
  /**
   * activateMedia: true is useful to activate media even before it's uploaded.
   * Allows to store the images as objects rather than through a relationship.
   */
  activateMedia: false,
  canSort: true,
  canRename: true,
  canRenameCaption: true,
  /**
   * forcedName: used to force a file name when creating transaction documents through
   * the transaction documents page or transaction process flow
   * This SHOULD NOT be used other wise, and only works for ONE file
   * MUST include extension
   */
  forcedName: false,
  canDownload: true,
  canPreview: true,
  runner: BlMediaFieldClass,
  runnerComponent: false,
};

/** Generated Params */
export const mediaFieldParams = propsWithDefaults(
  mediaFieldParamsDefaults,
  mediaFieldParamsTypes
);
export type BlMediaFieldParams = ExtractPropTypes<typeof mediaFieldParams>;

/** Dynamic Props */
export const mediaFieldProps = {
  ...baseFieldProps,
  ...mediaFieldParams,
};
export type BlMediaFieldProps = ExtractPropTypes<typeof mediaFieldProps>;

/** Emits */
export type BlMediaFieldEmits = {
  (e: 'update:modelValue', newVal: BlMediaFieldClass['modelValue']): void;
  (e: 'expose', exposed: BlMediaFieldExposed): void;
};

/** Refs */
export interface BlMediaFieldRefs {
  uploader: QUploader | null;
  uploaderList: HTMLElement | null;
}

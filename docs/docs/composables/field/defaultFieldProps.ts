import { ValidationRule } from 'quasar';
import { ExtractPropTypes, PropType } from 'vue';

import { FieldValue } from '@/types/field';
import { type ExtractPropDefaultTypes, propsWithDefaults } from 'ivue';

export const fieldPropsTypes = {
  modelValue: {
    type: [Object, String, Number, Array, undefined] as PropType<
      FieldValue | FieldValue[]
    >,
    /**
     * Should not be required: true, otherwise fieldsMapper will complain, if data does not exist.
     */
  },
  name: {
    type: String as PropType<string>,
  },
  required: {
    type: Boolean as PropType<boolean>,
  },
  disable: {
    type: Boolean as PropType<boolean>,
  },
  highlightChanges: {
    type: Boolean as PropType<boolean>,
  },
  readonly: {
    type: Boolean as PropType<boolean>,
  },
  mask: {
    type: String as PropType<string>,
  },
  rules: {
    type: Array as PropType<ValidationRule[]>,
  },
  // Styling
  hidden: {
    type: Boolean as PropType<boolean>,
  },
  hideLabel: {
    type: Boolean as PropType<boolean>,
  },
  col: {
    type: Number as PropType<number>,
  },
  color: {
    type: String as PropType<string>,
  },
  class: {
    type: String as PropType<string>,
  },
  dense: {
    type: Boolean as PropType<boolean>,
  },
  fieldsClass: {
    type: String as PropType<string>,
  },
  filled: {
    type: Boolean as PropType<boolean>,
  },
  outlined: {
    type: Boolean as PropType<boolean>,
  },
  style: {
    type: [String, Object] as PropType<string | Partial<CSSStyleDeclaration>>,
  },
  // Text
  hint: {
    type: String as PropType<string>,
  },
  label: {
    type: String as PropType<string>,
  },
  prefix: {
    type: String as PropType<string>,
  },
  placeholder: {
    type: String as PropType<string>,
  },
};

export const fieldPropsDefaults: ExtractPropDefaultTypes<
  typeof fieldPropsTypes
> = {
  modelValue: undefined,
  name: '',
  required: false,
  disable: false,
  highlightChanges: false,
  readonly: false,
  mask: undefined,
  rules: [],
  // Styling
  hidden: false,
  hideLabel: false,
  col: 12,
  color: 'black',
  class: '',
  dense: true,
  fieldsClass: '',
  filled: false,
  outlined: false,
  style: '',
  // Text
  hint: '',
  label: '',
  prefix: '',
  placeholder: '',
};

export const baseFieldProps = propsWithDefaults(
  fieldPropsDefaults,
  fieldPropsTypes
);

export type IFieldProps = ExtractPropTypes<typeof baseFieldProps>;

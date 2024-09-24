import _cloneDeep from 'lodash/cloneDeep';
import { ExtractPropTypes, PropType } from 'vue';

import { baseFieldProps } from '@/composables/field/defaultFieldProps';
import { ExtractEmitTypes, ExtractPropDefaultTypes, propsWithDefaults } from 'ivue';

import {
  chooseFieldEmits,
  chooseFieldParamsDefaults,
  chooseFieldParamsTypes,
} from './BlChooseFieldProps';

export const contactFieldParamsTypes = {
  ..._cloneDeep(chooseFieldParamsTypes),

  /** Custom Contact Properties. */
  transactionId: { type: String as PropType<string> },
  contactType: { type: Array as PropType<string[]> },
  useVariants: { type: Boolean as PropType<boolean> }
};

export const contactFieldParamsDefaults: ExtractPropDefaultTypes<
  typeof contactFieldParamsTypes
> = {
  ..._cloneDeep(chooseFieldParamsDefaults),

  /** Choose Field Property Overrides. */
  useChips: true,
  roundChips: true,
  useInput: true,
  hideDropdownIcon: true,
  optionComponent: 'components/option/ContactOption',

  /** Custom Contact Properties. */
  transactionId: '',
  contactType: [],
  useVariants: false
};

/** Default Params. */
export const contactFieldParams = propsWithDefaults(
  contactFieldParamsDefaults,
  contactFieldParamsTypes
);
export type BlChooseContactFieldParams = ExtractPropTypes<typeof contactFieldParams>;

/** Dynamic Props. */
export const contactFieldProps = {
  ...baseFieldProps,
  ...contactFieldParams,
};
export type BlChooseContactFieldProps = ExtractPropTypes<typeof contactFieldProps>;

/** Dynamic Emits. */
export const contactFieldEmits = { ...chooseFieldEmits };
export type BlChooseContactFieldEmits = ExtractEmitTypes<typeof contactFieldEmits>;

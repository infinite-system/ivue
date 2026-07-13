// ContactFieldProps.ts — ChooseField params preconfigured for contacts.
//
// The params/defaults architecture pays off here: the contact field spreads
// the choose-field types and defaults and overrides ONLY what differs —
// chips on, server search + pagination against '/contact', contact-shaped
// label/description priorities — then adds its own `compact` display mode.

import type { ExtractPropTypes, PropType } from 'vue';

import {
  type ExtractEmitTypes,
  type ExtractPropDefaultTypes,
  propsWithDefaults,
} from '../../../ivue';
import { baseFieldProps } from '../field-kit';
import {
  chooseFieldEmits,
  chooseFieldParamsDefaults,
  chooseFieldParamsTypes,
} from './ChooseFieldProps';

export const contactFieldParamsTypes = {
  ...chooseFieldParamsTypes,

  /** Compact display mode: smaller avatar, name only, denser rows. */
  compact: { type: Boolean as PropType<boolean> },
};

export const contactFieldParamsDefaults: ExtractPropDefaultTypes<
  typeof contactFieldParamsTypes
> = {
  ...chooseFieldParamsDefaults,

  /** Choose Field overrides. */
  useChips: true,
  roundChips: true,
  useInput: true,
  hideDropdownIcon: true,
  fetchPath: '/contact',
  fetchSearch: true,
  fetchPagination: true,
  fetchRowsPerPage: 8,
  fetchSort: 'name:asc',
  optionLabelPriority: ['name', 'email', 'id'],
  optionDescriptionPriority: ['role', 'company', 'email'],
  createLabel: 'Create contact',

  /** Custom contact params. */
  compact: false,
};

/** Params */
export const contactFieldParams = propsWithDefaults(
  contactFieldParamsDefaults,
  contactFieldParamsTypes,
);
export type ContactFieldParams = ExtractPropTypes<typeof contactFieldParams>;

/** Props */
export const contactFieldProps = {
  ...baseFieldProps,
  ...contactFieldParams,
};
export type ContactFieldProps = ExtractPropTypes<typeof contactFieldProps>;

/** Emits */
export const contactFieldEmits = { ...chooseFieldEmits };
export type ContactFieldEmits = ExtractEmitTypes<typeof contactFieldEmits>;

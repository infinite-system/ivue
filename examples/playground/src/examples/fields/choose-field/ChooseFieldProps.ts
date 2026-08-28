// ChooseFieldProps.ts — the params/defaults architecture for ChooseField.
//
// Params are declared twice on purpose: once as Vue prop TYPES, once as a
// plain DEFAULTS object; `propsWithDefaults` merges them into a
// defineComponent()-style props object (wrapping object/array defaults in
// factories). Extending fields (see ContactFieldProps.ts) spread and
// override both maps, so a subclass component redefines only what differs.

import type { QSelectOption, QSelectProps, QSelectSlots } from 'quasar';
import type { ExtractPropTypes, PropType } from 'vue';

import {
  type ExtendSlots,
  type ExtractEmitTypes,
  type ExtractPropDefaultTypes,
  type IFnParameter,
  definePropTypes,
  propsWithDefaults,
} from '../../../ivue';
import { baseFieldProps } from '../field-kit';

export type KeyValueRow = Record<string, any>;
export type ChooseOption = string | number | QSelectOption | KeyValueRow;

/**
 * Client-side option filter: a `{ key, value }` equality predicate applied
 * to each loaded option row. Deliberately tiny — the server-side
 * `fetchFilters` string handles anything richer.
 */
export interface OptionFilter {
  key: string;
  value: any;
}

/** A named preset of server + client filtering the user can switch between. */
export interface ChooseFieldVariant {
  label: string;
  default?: true;
  icon?: string;
  fetchFilters?: string;
  fetchSort?: string;
  /** Client filters & sort are applied after server-side fetch filters & sort. */
  optionFilters?: OptionFilter[];
  optionSort?: string;
}

/* === Choose Field Params === */

/** Params Types */
export const chooseFieldParamsTypes = definePropTypes({
  /** === QSelect Overrides === */
  multiple: { type: Boolean as PropType<boolean> },
  /** Chips */
  useChips: { type: Boolean as PropType<boolean> },
  roundChips: { type: Boolean as PropType<boolean> },
  /** Input */
  useInput: { type: Boolean as PropType<boolean> },
  inputDebounce: { type: Number as PropType<number> },
  /** Icons */
  dropdownIcon: { type: String as PropType<string> },
  hideDropdownIcon: { type: Boolean as PropType<boolean> },
  /** Options */
  options: { type: Array as PropType<ChooseOption[]> },
  optionValue: { type: String as PropType<string> },
  optionsCover: { type: Boolean as PropType<boolean> },
  prependOptions: { type: Array as PropType<ChooseOption[]> },
  appendOptions: { type: Array as PropType<ChooseOption[]> },
  /** Clearable */
  clearable: { type: Boolean as PropType<boolean> },
  clearIcon: { type: String as PropType<string> },
  /** New Value Mode */
  newValueMode: {
    type: String as PropType<'add' | 'add-unique' | 'toggle' | undefined>,
  },
  /** === QSelect Overrides End === */

  /** === Custom Choose Field Params === */
  /** Client-side filtering — `{ key, value }` equality rows; @see fetchFilters for server side. */
  optionFilters: { type: Array as PropType<OptionFilter[]> },
  /** Client-side sorting in 'field:asc,field2:desc' format; @see fetchSort for server side. */
  optionSort: { type: String as PropType<string> },
  /** Options */
  optionClass: { type: String as PropType<string> },
  /** Label */
  optionLabel: { type: String as PropType<string> },
  optionLabelPriority: { type: Array as PropType<string[]> },
  /** Description */
  optionDescription: { type: String as PropType<string> },
  optionDescriptionPriority: { type: Array as PropType<string[]> },
  /** Chip */
  chipClass: { type: String as PropType<string> },
  /** Icon */
  icon: { type: String as PropType<string> },
  /** Variants */
  variants: { type: Array as PropType<ChooseFieldVariant[]> },

  /** The driving runner — a ChooseField subclass CLASS (the base
   *  constructs it) or a pre-built INSTANCE (a wrapping component passes
   *  its own, carrying the wrapper's props and emit — see ContactField).
   *  Ported v1 mechanism. */
  runner: { type: [Function, Object] as PropType<any> },

  /** Fetch */
  fetchPath: { type: String as PropType<string> },
  fetchOnFocus: { type: Boolean as PropType<boolean> },
  fetchScrollThreshold: { type: Number as PropType<number> },
  /** Fetch Filters */
  fetchFilters: { type: String as PropType<string> },
  fetchSort: { type: String as PropType<string> },
  /** Fetch Search */
  fetchSearch: { type: Boolean as PropType<boolean> },
  /** Fetch Pagination */
  fetchPagination: { type: Boolean as PropType<boolean> },
  fetchRowsPerPage: { type: Number as PropType<number> },
  /** Create */
  createPath: { type: String as PropType<string> },
  createLabel: { type: String as PropType<string> },
  createEntityAsOption: { type: Boolean as PropType<boolean> },
});

/** Params Defaults */
export const chooseFieldParamsDefaults: ExtractPropDefaultTypes<
  typeof chooseFieldParamsTypes
> = {
  /** === QSelect Overrides === */
  multiple: false,
  /** Chips */
  useChips: false,
  roundChips: false,
  /** Input */
  useInput: false,
  inputDebounce: 250,
  /** Icons */
  dropdownIcon: 'arrow_drop_down',
  hideDropdownIcon: false,
  /** Options */
  options: [],
  optionValue: '',
  optionsCover: false,
  prependOptions: [], // Extra options ahead of fetched/static options.
  appendOptions: [], // Extra options after fetched/static options.
  /** Clearable */
  clearable: false,
  clearIcon: 'close',
  /** New Value Mode */
  newValueMode: undefined,
  /** === QSelect Overrides End === */

  /** === Custom Choose Field Params === */
  optionFilters: [], // Client-side equality filters, applied after any server fetch.
  optionSort: '', // Client-side sort, 'field:asc,field2:desc' — same grammar as fetchSort.
  /** Options */
  optionClass: '',
  /** Option Label */
  optionLabel: '', // Custom prop to use for the label.
  optionLabelPriority: ['label', 'name', 'value', 'id'], // Fallback chain when optionLabel is not set.
  /** Option Description */
  optionDescription: '', // Custom prop to use for the description.
  optionDescriptionPriority: ['description', 'caption'], // Fallback chain when optionDescription is not set.
  /** Chips */
  chipClass: '',
  /** Icon */
  icon: '',
  /** Variants */
  variants: [],
  /** Runner */
  runner: null,

  /** Fetch */
  fetchPath: '', // List endpoint to fetch options from ('' = purely client-side options).
  fetchOnFocus: true, // Refetch on each focus, for an always-fresh-data feel.
  fetchScrollThreshold: 5, // Items left below the viewport that trigger the next-page fetch.
  /** Fetch Filters */
  fetchFilters: '', // Server-side filter expression; @see optionFilters for client side.
  fetchSort: '', // Server-side sort: 'columnName:asc,columnName2:desc'; @see optionSort for client side.
  /** Fetch Search */
  fetchSearch: false, // Search through the server even without pagination.
  /** Fetch Pagination */
  fetchPagination: false, // Implies server search — client search over a partial page lies.
  fetchRowsPerPage: 20,
  /** Create */
  createPath: '', // POST endpoint enabling the create-new-option affordance.
  createLabel: '',
  createEntityAsOption: true, // Show the create affordance as the first option row while typing.
};

/** Params */
export const chooseFieldParams = propsWithDefaults(
  chooseFieldParamsDefaults,
  chooseFieldParamsTypes,
);
export type ChooseFieldParams = ExtractPropTypes<typeof chooseFieldParams>;

/** Props */
export const chooseFieldProps = {
  ...baseFieldProps,
  ...chooseFieldParams,
};
export type ChooseFieldProps = ExtractPropTypes<typeof chooseFieldProps>;

/** Emits */
export const chooseFieldEmits = {
  'update:model-value': (value: any) => true,
  remove: (details: IFnParameter<QSelectProps, 'onRemove', 0>) => true,
};
export type ChooseFieldEmits = ExtractEmitTypes<typeof chooseFieldEmits>;

/** Slots — every QSelect slot, plus a 'before--'/'after--' pair around each. */
export type ChooseFieldSlots = ExtendSlots<QSelectSlots>;

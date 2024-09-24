/* eslint-disable @typescript-eslint/no-unused-vars */
import { FilterOptions } from '@chronicstone/array-query';
import { QSelectOption, QSelectProps, QSelectSlots } from 'quasar';
import { ExtractPropTypes, PropType } from 'vue';

import { baseFieldProps } from '@/composables/field/defaultFieldProps';
import { IKeyValue } from '@/types/core';
import { IField } from '@/types/field';
import {
  ExtendSlots,
  ExtractEmitTypes,
  ExtractPropDefaultTypes,
  IFnParameter,
  propsWithDefaults,
} from 'ivue';

import BlChooseFieldClass from './BlChooseFieldClass';

export interface BlChooseFieldVariant {
  label: string;
  default?: true;
  icon?: string;
  fetchFilters?: string;
  fetchSort?: string;
  /** Client filters & sort are applied after server-side fetch filters & sort. */
  optionFilters?: FilterOptions;
  optionSort?: string;
}

/* === Choose Field Params === */

/** Params Types */
export const chooseFieldParamsTypes = {
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
  options: {
    type: [Array] as PropType<(string | number | QSelectOption | IKeyValue)[]>,
  },
  optionValue: {
    type: [String, undefined, Function] as PropType<
      string | undefined | (() => any)
    >,
  },
  optionsCover: { type: Boolean as PropType<boolean> },
  prependOptions: {
    type: [Array] as PropType<(string | number | QSelectOption | IKeyValue)[]>,
  },
  appendOptions: {
    type: [Array] as PropType<(string | number | QSelectOption | IKeyValue)[]>,
  },
  /** Clearable */
  clearable: { type: Boolean as PropType<boolean> },
  clearIcon: { type: String as PropType<string> },
  /** New Value Mode */
  newValueMode: {
    type: String as PropType<'add' | 'add-unique' | 'toggle' | undefined>,
  },
  /** === QSelect Overrides End === */

  /** === Custom Choose Field Params === */
  optionFilters: { type: Array as PropType<FilterOptions> }, // Client side filtering @see {FilterOptions}, @see https://array-query.vercel.app/features/filtering#filter-structure @see fetchFilters for server side filtering
  optionSort: { type: String as PropType<string> }, // Client side sorting uses 'field:desc,field2.asc' format just like server-side @see fetchSort for server side sort
  /** Options */
  optionClass: { type: String as PropType<string> },
  optionComponent: { type: String as PropType<string> },
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
  variants: { type: Array as PropType<BlChooseFieldVariant[]> },
  /** Project */
  projectId: { type: String as PropType<string> },

  /** CRUD */
  /** Fetch */
  fetchEntity: { type: [Boolean, String] as PropType<false | string> },
  fetchPath: { type: String as PropType<string> },
  fetchFieldsTemplate: { type: [Array, Object] as PropType<IField[]> },
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
  createEntity: { type: [Boolean, String] as PropType<boolean | string> },
  createPath: { type: String as PropType<string> },
  createFieldsTemplate: { type: [Array, Object] as PropType<IField[]> },
  createLabel: { type: String as PropType<string> },
  createEntityAsOption: {
    type: [Boolean, String] as PropType<boolean | string>,
  },
  /** Update */
  updateEntity: { type: [Boolean, String] as PropType<boolean | string> },
  updatePath: { type: String as PropType<string> },
  updateFieldsTemplate: { type: [Array, Object] as PropType<IField[]> },
  updateLabel: { type: String as PropType<string> },
  /** Drag and Drop */
  draggable: { type: Boolean as PropType<boolean> },
  /** Runtime Class Runner */
  runner: {
    type: [Object, Function, Boolean] as PropType<
      any | BlChooseFieldClass | false
    >,
  },
};

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
  optionValue: undefined,
  optionsCover: undefined,
  prependOptions: [], // Additional options preppended for when options are fetched but some custom options are desired.
  appendOptions: [], // Additional options appended for when options are fetched but some custom options are desired.
  /** Clearable */
  clearable: false,
  clearIcon: 'close',
  /** New Value Mode */
  newValueMode: undefined,
  /** === QSelect Overrides End === */

  /** === Custom Choose Field Params === */
  /** Option Filters */
  optionFilters: [], // Client side filtering @see {FilterOptions}, @see https://array-query.vercel.app/features/filtering#filter-structure @see fetchFilters for server side filtering
  optionSort: '', // Client side sorting uses 'field:desc,field2.asc' format just like server-side @see fetchSort for server side sort
  /** Options */
  optionComponent: '', // Define dynamic component to use for option / selected-item / chip
  optionClass: '',
  /** Option Label */
  optionLabel: '', // Custom prop to use for the label
  optionLabelPriority: ['label', 'name', 'value', 'id'], // Priority of props to show as the label if custom optionLabel is not defined
  /** Option Description */
  optionDescription: '', // Custom prop to use for the description
  optionDescriptionPriority: ['description', 'caption'], // Priority of props to show as the label if custom optionDescription is not defined
  /** Chips */
  chipClass: '',
  /** Icon */
  icon: '',
  /** Variants: */
  variants: [],
  /** Project Id */
  projectId: '',

  /** CRUD */
  /** Fetch */
  fetchPath: '', // The path to fetch the data options from crud data source
  fetchEntity: false, // fetchEntity: 'entity_name', fetches the fieldsTemplate based on that name from global or project fields templates, unless fetchFieldsTemplate is specified.
  fetchFieldsTemplate: [], // Uses project or global fields template (based on { fetchEntity: 'entity_name' } prop) if empty [], otherwise uses the specified fields template, if it is an array of length greater than 0.
  fetchOnFocus: true, // On each refocus the data will be refetched from the server, this is for live ui feel experience of always having fresh data
  fetchScrollThreshold: 5, // On scroll of options list, Number of items left that are not visible in the view port at which point you trigger background ajax fetch call of the next page
  /** Fetch Filters */
  fetchFilters: '', // Any valid PostGres SQL where string; @see optionFilters for client side options filtering
  fetchSort: '', // Crud service sort format: 'columnName:asc,columnName2:desc'; @see optionSort for client side options sort
  /** Fetch Search */
  fetchSearch: false, // Use fetchSearch: true, if you want to use server side search without server side pagination, meaning the whole data set will be loaded, but search will still be through the server not the client
  /** Fetch Pagination */
  fetchPagination: false, // fetchPagination: true will make fetchSearch: true as well, because client search through paginated result will give only partial results, pure client search cannot be used with pagination
  fetchRowsPerPage: 20,
  /** Create */
  createPath: '',
  createEntity: false, // { createEntity: true } will enable creation of entity if { fetchEntity: 'entity_name' } is set; { createEntity: 'another_entity' } can enable creating an entity with another fields template
  createFieldsTemplate: [],
  createLabel: '',
  createEntityAsOption: true,
  /** Update */
  updatePath: '',
  updateEntity: false, // { updateEntity: true } will enable updating of entity if { fetchEntity: 'entity_name' } is set; { updateEntity: 'another_entity' } can enable updating an entity with another fields template
  updateFieldsTemplate: [],
  updateLabel: '',
  /** Drag and Drop */
  draggable: true,
  /** Runtime Class Runner */
  runner: false,
};

/** Params */
export const chooseFieldParams = propsWithDefaults(
  chooseFieldParamsDefaults,
  chooseFieldParamsTypes
);
export type IChooseFieldParams = ExtractPropTypes<typeof chooseFieldParams>;

/** Props */
export const chooseFieldProps = {
  ...baseFieldProps,
  ...chooseFieldParams,
};
export type IChooseFieldProps = ExtractPropTypes<typeof chooseFieldProps>;

/** Emits */

export const chooseFieldEmits = {
  'update:model-value': (newVal: any) => true,
  'update:selected-items': (newVal: any) => true,
  remove: (scope: IFnParameter<QSelectProps, 'onRemove', 0>) => true,
  expose: (exposed: BlChooseFieldClass) => true,
};

export type IChooseFieldEmits = ExtractEmitTypes<typeof chooseFieldEmits>;

/** Slots */
export type BlChooseFieldSlots = ExtendSlots<QSelectSlots>;

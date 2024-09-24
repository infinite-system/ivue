/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dayjs } from 'dayjs';
import { QSelectOption, ValidationRule } from 'quasar';

import {
  IChooseFieldConfig,
  IChooseFieldParams,
} from '@/components/field/BlChooseFieldProps';
import { IDateFormulaFieldParams } from '@/components/field/BlDateFormulaField.vue';
import { IRangeFieldParams } from '@/components/field/BlRangeField.vue';

import { IKeyValue } from './core';
import { BlMediaFieldParams } from '../components/field/BlMediaFieldProps';

export type EmptyParams = Record<string, any>;

export interface FieldTypeParamsMap {
  title: Partial<EmptyParams>;
  label: Partial<EmptyParams>;
  boolean: Partial<EmptyParams>;
  email: Partial<EmptyParams>;
  password: Partial<EmptyParams>;
  text: Partial<EmptyParams>;
  textarea: Partial<EmptyParams>;
  number: Partial<EmptyParams>;
  date: Partial<EmptyParams>;
  date_time: Partial<EmptyParams>;
  time: Partial<EmptyParams>;
  address_autocomplete: Partial<EmptyParams>;
  country: Partial<EmptyParams>;
  state: Partial<{
    /**
     * state field options will update automatically if country_field_prop matches the updated country field's `name` property
     */
    country_field_prop?: string;
  }>;
  select: Partial<EmptyParams>;
  choose: Partial<IChooseFieldParams>;
  choose_contact: Partial<EmptyParams>;
  phone: Partial<EmptyParams>;
  file: Partial<EmptyParams>;
  media: Partial<BlMediaFieldParams>;
  blackline_agreement: Partial<EmptyParams>;
  range: Partial<IRangeFieldParams>;
  formula: Partial<{
    /**
     * used to connect a select field to the formula field for transaction_items
     */
    items_field_prop?: string;
  }>;
  tag: Partial<EmptyParams>;
  date_formula: Partial<IDateFormulaFieldParams>;
  colour: Partial<EmptyParams>;
  button: Partial<EmptyParams>;
  editable_html: Partial<EmptyParams>;
  select_inventory: Partial<EmptyParams>;
}

export type EmptyConfig = Record<string, any>;

export type FieldTypeConfigMap = {
  [index in keyof FieldTypeParamsMap]: Partial<EmptyConfig>;
} & {
  choose: Partial<IChooseFieldConfig>;
  state: Partial<{
    country_field_prop: string;
  }>;
  formula: Partial<{
    items_field_prop: string;
  }>;
};

export type FieldType = keyof FieldTypeParamsMap;

export type FieldParams<T extends FieldType> = FieldTypeParamsMap[T];
export type FieldConfig<T extends FieldType> = FieldTypeConfigMap[T];

export type FieldValue =
  | File
  | FileList
  | any[]
  | any
  | IKeyValue
  | string
  | number
  | boolean
  | null
  | Date
  | Dayjs
  | undefined;

export interface IFieldBaseProps {
  prop?: string;
  name?: string;
  // Behaviour
  required?: boolean;
  disable?: boolean;
  highlightChanges?: boolean;
  readonly?: boolean;
  mask?: string;
  rules?: ValidationRule[];

  // Styling
  hidden?: boolean;
  hideLabel?: boolean;
  col?: number;
  color?: string;
  class?: string;
  dense?: boolean;
  borderless?: boolean;
  fieldsClass?: string;
  filled?: boolean;
  outlined?: boolean;
  style?: string | Partial<CSSStyleDeclaration>;

  // Text
  hint?: string;
  label?: string;
  prefix?: string;
  placeholder?: string;
}

export interface IFieldProps extends IFieldBaseProps {
  modelValue: FieldValue;
}

export interface ISelectFieldProps extends IFieldProps {
  multipleSelect?: boolean;
  useChips?: boolean;
  useInput?: boolean;
  selectOptions?: (QSelectOption | string)[];
}

export interface IFormulaFieldProps extends IFieldProps {
  variables?: string[];
  rounding?: boolean;
  selectedItems?: IKeyValue[];
  instalments?: object;
  taxes?: object;
  priceType?: string;
  order?: number | undefined; // to ignore itself when picking payments/commissions
}

export interface IField extends IFieldBaseProps {
  //Core
  prop?: string;
  type: FieldType;
  eager?: string;

  // Value
  value?: FieldValue;
  originalValue?: FieldValue;
  defaultValue?: FieldValue;

  hideInEdit?: boolean;
  hideFromImport?: boolean;

  filterOptions?: any[] | undefined; // Processing

  /** For table to render an icon to open entity details */
  openDetails?: boolean;

  // Operating parameters
  valueHidden?: boolean; // For password field

  config?: FieldConfig<this['type']>;

  params?: FieldParams<this['type']>;

  // Table cell controls
  cellAlign?: 'left' | 'right' | 'center';
  // Width of the column
  cellWidth?: number | string;
  // View Cell
  cellTemplate?: string;
  // Cell Params to pass into the Cell
  cellParams?: Record<string, any>;

  cellClass?: string;
  cellStyle?: string;

  override?: {
    table?: Partial<IField>;
    propertyCard?: Partial<IField>;
    createForm?: Partial<IField>;
    updateForm?: Partial<IField>;
    importCard?: Partial<IField>;
  };

  sort?: boolean | string;
  searchable?: boolean;
  // To be removed

  // Formula
  rounding?: boolean;

  // Select
  multipleSelect?: boolean;

  selectOptions?: (QSelectOption | string)[];
  options?: any[] | undefined; // Template or requested
  useChips?: boolean;
  useInput?: boolean;

  // Config
  object_label?: string;
  options_entity_name?: string;
  options_type_name?: string;
  related_entity_option_label_prop?: string;

  // Boolean
  booleanTrueLabel?: string;
  booleanFalseLabel?: string;

  // Formula
  selectedItems?: IKeyValue[];
  variables?: string[];

  // Multi section form
  uniqueAcrossInstances?: boolean;
}

export interface IFilterFieldProp {
  prop: string;
  value: any;
}

export interface QTableCol {
  name: string;

  // label for header
  label: string;

  // row Object property to determine value for this column
  field: string | ((row: any) => string);
  // OR field: row => row.some.nested.prop,

  // (optional) if we use visible-columns, this col will always be visible
  required: boolean;

  // (optional) alignment
  align: 'left' | 'center' | 'right';

  // (optional) tell QTable you want this column sortable
  sortable: boolean;

  // (optional) compare function if you have
  // some custom data or want a specific way to compare two rows
  // --> note that rows with null/undefined as value will get auto sorted
  // without calling this method (if you want to handle those as well, use "rawSort" instead)
  sort: (a: any, b: any, rowA: any, rowB: any) => number;
  // function return value:
  //   * is less than 0 then sort a to an index lower than b, i.e. a comes first
  //   * is 0 then leave a and b unchanged with respect to each other, but sorted with respect to all different elements
  //   * is greater than 0 then sort b to an index lower than a, i.e. b comes first

  // (optional) requires Quasar v2.13+
  // compare function if you have
  // some custom data or want a specific way to compare two rows
  // --> note that there is an alternative "sort" method (above) if you don't
  // want to handle (by yourself) rows with null/undefined as value
  rawSort: (a: any, b: any, rowA: any, rowB: any) => number;
  // has the same return value as the alternative "sort" method above

  // (optional) override 'column-sort-order' prop;
  // sets column sort order: 'ad' (ascending-descending) or 'da' (descending-ascending)
  sortOrder: 'ad' | 'da'; // or 'da'

  // (optional) you can format the data with a function
  format: (val: any, row: any) => any;
  // one more format example:
  // format: val => val
  //   ? /* Unicode checkmark checked */ "\u2611"
  //   : /* Unicode checkmark unchecked */ "\u2610",

  // body td:
  style: string | ((row: any) => string | string[] | object);
  // or as Function --> style: row => ... (return String/Array/Object)
  classes: string | ((row: any) => string);
  // or as Function --> classes: row => ... (return String)

  // header th:
  headerStyle: string;
  headerClasses: string;
}

export interface QTableCellProps {
  col: QTableCol;
  cols: QTableCol[];
  pageIndex: number;
  rowIndex: number;
  row: any;
  key: any;
  value: any;
}

export interface IBlTableCellProps {
  cell: QTableCellProps;
  columnName?: string;
  entityName?: string | undefined;
  fieldTemplate?: IField;
}

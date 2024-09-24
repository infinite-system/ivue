/* eslint-disable @typescript-eslint/no-explicit-any */
import _ from 'lodash';
import _cloneDeep from 'lodash/cloneDeep';
import _mergeWith from 'lodash/mergeWith';

import {
  IField
} from '@/types/field';


/**
 * Overridable fields template configuration loader.
 * If we have default fieldsTemplate like this:
 * ```
 * const fields: IField[] = [{
 *   prop: 'name',
 *   type: 'text',
 *   override: {
 *      updateForm: {
 *       type: 'email',
 *     }
 *   }
 * }]
 * const updateFormFieldsTemplate = formatFieldsTemplate(fields, 'updateForm');
 * ```
 * `updateFormFieldsTemplate` will result in
 * [{
 *    prop: 'name',
 *    type: 'email'
 * }]
 */
export function formatFieldsTemplate(
  fieldsTemplate: IField[],
  viewType: keyof Required<IField>['override'],
  defaultsFormatter?: (field: IField) => Partial<IField>
) {
  const formattedTemplate = _cloneDeep(fieldsTemplate).map((field: IField) => {
    field = _mergeWith(
      field,
      defaultsFormatter ? defaultsFormatter(field) : {},
      _cloneDeep(
        field?.override?.[viewType] ?? {}
      ) /** Clone deep is necessary here, otherwise the default field root level gets overwritten. */,
      (a, b) => (_.isArray(b) ? b : undefined) // This is so that the arrays are not merged but overriden @see https://stackoverflow.com/a/66247134/1502706
    );

    return field;
  });

  switch (viewType) {
    case 'table':
    case 'propertyCard':
      return formattedTemplate.filter((field: IField) => !field.hidden);
    case 'createForm':
    case 'updateForm':
      return formattedTemplate.filter((field: IField) => !field.readonly);
    default:
      return formattedTemplate;
  }
}

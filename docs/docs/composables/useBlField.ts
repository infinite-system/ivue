import cloneDeep from 'lodash/cloneDeep';
import { ValidationRule } from 'quasar';
import { ComputedRef, computed, toRefs } from 'vue';

import { FieldType } from '@/types/field';

import { IFieldProps } from './field/defaultFieldProps';

export function useBlFieldNew(
  props: IFieldProps,
  defaultValidationRules?: ValidationRule[]
) {
  const { required, readonly, rules, modelValue, highlightChanges } =
    toRefs(props);

  const isRequired: ValidationRule = (val: FieldType) =>
    !(required.value && (val?.toString()?.length || 0) === 0) ||
    'This field is required';

  const validationRules: ComputedRef<ValidationRule[]> = computed(() => {
    if (readonly.value) return [];
    const actualRules: ValidationRule[] = [];
    (rules.value || []).forEach((rule) => {
      switch (rule) {
        case 'email':
          actualRules.push((val: any, rules: any) => {
            if (typeof val === 'string') {
              return rules.email(val) || 'Please enter a valid email address';
            } else if (Array.isArray(val)) {
              for (let i = 0; i < val.length; i++) {
                if (
                  (typeof val[i] === 'object' && !rules.email(val[i].email)) ||
                  (typeof val[i] === 'string' && !rules.email(val[i]))
                ) {
                  return 'Please enter a valid email address';
                }
              }
            }
          });
          break;
        default:
          actualRules.push(rule);
      }
    });

    return [
      isRequired,
      ...(defaultValidationRules ?? []),
      ...(actualRules ?? []),
    ] as ValidationRule[];
  });

  const originalValue = cloneDeep(modelValue.value);

  const changeMade: ComputedRef<boolean> = computed<boolean>(() => {
    const ogValue =
      typeof originalValue === 'object'
        ? JSON.stringify(originalValue, null, 2)
        : originalValue;
    const newValue =
      typeof modelValue.value === 'object'
        ? JSON.stringify(modelValue.value, null, 2)
        : modelValue.value;
    return (
      highlightChanges.value &&
      originalValue !== '' &&
      originalValue !== null &&
      originalValue !== undefined &&
      ogValue !== newValue
    );
  });

  return {
    originalValue,
    changeMade,
    validationRules,
  };
}

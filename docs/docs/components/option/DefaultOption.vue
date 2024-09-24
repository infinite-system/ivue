<script setup lang="ts">
import { QItem, QItemSection, QItemLabel, QIcon } from 'quasar';
import { type Component, computed } from 'vue';

import {
  IChooseFieldParams,
  chooseFieldParamsDefaults,
} from '@/components/field/BlChooseFieldProps';

export interface BlChooseFieldDefaultOption {
  opt: any;
  index?: number;
  modelValue?: any;
  mode:
    | 'selected-item'
    | 'selected-item-chip'
    | 'chip'
    | 'option'
    | 'no-option'
    | 'view'
    | 'list';
  params?: IChooseFieldParams;
  component?: Component | false;
  scope?: any;
  commaSeparated?: boolean;
  itemClass?: string;
  itemProps?: any;
  clickable?: boolean;
}

const props = defineProps<BlChooseFieldDefaultOption>();

function resolveProperty(
  obj: any,
  prop: string,
  propPriority: string[],
  defaultValue?: string
) {
  if (typeof obj !== 'object') return defaultValue ?? obj;
  if (obj !== null && prop in obj) {
    return obj[prop];
  }
  for (let i = 0; i < propPriority.length; i++) {
    const prop = propPriority[i];
    if (obj !== null && prop in obj) {
      return obj[prop];
    }
  }
  return defaultValue ?? obj;
}

const label = computed(() => {
  return resolveProperty(
    props.opt,
    props?.params?.optionLabel ?? '',
    props?.params?.optionLabelPriority ??
      chooseFieldParamsDefaults['optionLabelPriority'] ??
      [],
    props.mode === 'no-option' ? 'Nothing found' : undefined
  );
});

const description = computed(() => {
  return resolveProperty(
    props.opt,
    props.params?.optionDescription ?? '',
    props.params?.optionDescriptionPriority ??
      chooseFieldParamsDefaults['optionDescriptionPriority'] ??
      [],
    ''
  );
});

const potentiallyComma = computed(() => {
  return props.commaSeparated &&
    Array.isArray(props.modelValue) &&
    props.index !== props.modelValue.length - 1
    ? ',\xa0' /** \xa0 is Vue parser safe alternative for &nbsp; space @see https://github.com/kazupon/vue-i18n/issues/318 */
    : '';
});

const customItemClass = computed(() => {
  return [
    props.mode === 'option'
      ? 'q-py-sm q-px-md'
      : props.params?.useChips
      ? 'q-pa-none'
      : 'q-pa-none',
    props.params?.optionClass,
  ];
});

const itemClass = computed(() => {
  return [
    props.mode === 'view'
      ? props.params?.useChips
        ? 'q-pa-xs'
        : 'q-pa-none'
      : props.itemClass ?? '',
    props.params?.optionClass,
    props.clickable && ['view', 'list'].includes(props.mode)
      ? 'text-primary'
      : 'text-grey-10',
  ];
});

const descriptionMaxWidth = computed(() => {
  switch (true) {
    case props.params?.multiple && props.mode !== 'option':
      return '150px';
    default:
      return 'auto';
  }
});
</script>
<template>
  <q-item
    v-if="component && opt?.value !== '__create_entity__'"
    :class="customItemClass"
    style="min-height: auto"
    v-bind="itemProps"
  >
    <component :is="component" v-bind="$props" />
  </q-item>
  <q-item
    v-else
    :class="[itemClass]"
    style="min-height: auto"
    v-bind="itemProps"
  >
    <q-item-section
      v-if="opt?.icon"
      avatar
      style="min-width: auto; padding-right: 10px"
    >
      <q-icon :name="opt.icon" />
    </q-item-section>
    <q-item-section>
      <q-item-label>{{ label }}{{ potentiallyComma }}</q-item-label>
      <q-item-label
        v-if="description"
        class="bl-choose--default-option-description"
        caption
        :lines="1"
        :title="description"
        >{{ description }}</q-item-label
      >
    </q-item-section>
  </q-item>
</template>
<style scoped>
.bl-choose--default-option-description {
  margin-top: 0;
  max-width: v-bind(descriptionMaxWidth);
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

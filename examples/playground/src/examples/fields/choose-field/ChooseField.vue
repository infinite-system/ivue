<script lang="ts" setup>
import {
  QBtn,
  QChip,
  QIcon,
  QItem,
  QItemLabel,
  QItemSection,
  QSelect,
  QTooltip,
} from 'quasar';

import { ChooseField } from './ChooseField';
import {
  type ChooseFieldSlots,
  chooseFieldEmits,
  chooseFieldProps,
} from './ChooseFieldProps';

const props = defineProps(chooseFieldProps);
const emit = defineEmits(chooseFieldEmits);

const choose = new ChooseField.Class(props, emit);

const {
  // state refs
  displayedOptions,
  activeVariantIndex,
  // computed refs
  model,
  // element refs
  selectEl,
} = choose;

/**
 * Extensible-slot mechanism (ported showcase feature): every consumer slot —
 * plus the ones this component fills itself — is forwarded into QSelect,
 * each wrapped by a `before--<slot>` / `after--<slot>` pair, so a wrapping
 * component can decorate around ANY QSelect slot without replacing it.
 */
const slots = defineSlots<ChooseFieldSlots>();
const activeSlots = new Set(
  Object.keys(slots)
    .map((slotName) => slotName.replace(/^(before|after)--/, ''))
    .concat(['prepend', 'selected-item', 'before-options', 'option', 'no-option']),
);

defineExpose(choose as ChooseField.Instance);
</script>

<template>
  <q-select
    ref="selectEl"
    v-model="model"
    class="ivue-choose"
    :label="choose.label"
    :hint="choose.hint"
    :dense="choose.dense"
    :outlined="choose.outlined"
    :readonly="choose.readonly"
    :disable="choose.disable"
    :loading="choose.loading"
    :multiple="choose.multiple"
    :use-input="choose.useInput"
    :use-chips="false"
    :input-debounce="choose.inputDebounce"
    :options="displayedOptions"
    :option-value="(option: any) => choose.optionValueOf(option)"
    :option-label="(option: any) => choose.optionLabelOf(option)"
    :options-cover="choose.optionsCover"
    :dropdown-icon="choose.dropdownIcon"
    :hide-dropdown-icon="choose.hideDropdownIcon"
    :clearable="choose.clearable"
    :clear-icon="choose.clearIcon"
    :new-value-mode="choose.newValueMode"
    @focus="() => choose.onFocus()"
    @filter="(inputValue, doneFn) => choose.onFilter(inputValue, doneFn)"
    @input-value="(value) => choose.onInputValue(value)"
    @remove="(details) => choose.onRemove(details)"
    @virtual-scroll="(details: any) => choose.onVirtualScroll(details)"
  >
    <!-- Every active slot forwards through, wrapped in before--/after-- hooks. -->
    <template v-for="slot of activeSlots" :key="slot" #[slot]="scope">
      <template v-if="slot === 'prepend'">
        <slot name="before--prepend" v-bind="scope || {}" />
        <slot name="prepend" v-bind="scope || {}">
          <q-icon v-if="choose.icon" :name="choose.icon" />
        </slot>
        <slot name="after--prepend" v-bind="scope || {}" />
      </template>

      <template v-else-if="slot === 'selected-item'">
        <slot name="before--selected-item" v-bind="scope || {}" />
        <slot name="selected-item" v-bind="scope || {}">
          <q-chip
            v-if="choose.useChips"
            :key="scope.index"
            class="ivue-choose__chip"
            removable
            dense
            size="14px"
            icon-remove="close"
            :tabindex="scope.tabindex"
            color="white"
            text-color="dark"
            :class="choose.chipClass"
            @remove="() => scope.removeAtIndex(scope.index)"
          >
            {{ choose.optionLabelOf(scope.opt) }}
          </q-chip>
          <span v-else class="ivue-choose__selected">
            {{ choose.optionLabelOf(scope.opt) }}
          </span>
        </slot>
        <slot name="after--selected-item" v-bind="scope || {}" />
      </template>

      <template v-else-if="slot === 'before-options'">
        <slot name="before--before-options" v-bind="scope || {}" />
        <slot name="before-options" v-bind="scope || {}">
          <!-- VARIANT SWITCHER -->
          <div v-if="choose.variants.length > 1" class="ivue-choose__variants">
            <q-btn
              v-for="(variant, index) in choose.variants"
              :key="variant.label"
              flat
              square
              dense
              class="ivue-choose__variant-btn"
              :icon="variant.icon"
              :color="choose.isActiveVariant(index) ? 'primary' : 'grey-8'"
              :class="{ 'ivue-choose__variant--active': activeVariantIndex === index }"
              @click="choose.setVariant(index)"
              >{{ variant.label }}</q-btn
            >
          </div>
        </slot>
        <slot name="after--before-options" v-bind="scope || {}" />
      </template>

      <template v-else-if="slot === 'option'">
        <slot name="before--option" v-bind="scope || {}" />
        <slot name="option" v-bind="scope || {}">
          <q-item
            v-bind="scope.itemProps"
            class="ivue-choose__option"
            :class="choose.optionClass"
          >
            <q-item-section v-if="choose.optionIconOf(scope.opt)" avatar>
              <q-icon :name="choose.optionIconOf(scope.opt)" />
            </q-item-section>
            <q-item-section>
              <q-item-label v-if="scope.opt?.createTerm">
                {{ choose.createLabel || 'Create new' }}
                <span class="ivue-choose__create-term">{{
                  scope.opt.createTerm
                }}</span>
              </q-item-label>
              <q-item-label v-else>
                {{ choose.optionLabelOf(scope.opt) }}
              </q-item-label>
              <q-item-label v-if="choose.optionDescriptionOf(scope.opt)" caption>
                {{ choose.optionDescriptionOf(scope.opt) }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </slot>
        <slot name="after--option" v-bind="scope || {}" />
      </template>

      <template v-else-if="slot === 'no-option'">
        <slot name="before--no-option" v-bind="scope || {}" />
        <slot name="no-option" v-bind="scope || {}">
          <div v-if="choose.variants.length > 1" class="ivue-choose__variants">
            <q-btn
              v-for="(variant, index) in choose.variants"
              :key="variant.label"
              flat
              square
              dense
              class="ivue-choose__variant-btn"
              :icon="variant.icon"
              :color="choose.isActiveVariant(index) ? 'primary' : 'grey-8'"
              @click="choose.setVariant(index)"
              >{{ variant.label }}</q-btn
            >
          </div>
          <!-- CREATE AFFORDANCE when nothing matches -->
          <q-item
            v-if="choose.canCreate && scope.inputValue"
            clickable
            @click="choose.createOption()"
          >
            <q-item-section avatar><q-icon name="add" /></q-item-section>
            <q-item-section>
              <q-item-label>
                {{ choose.createLabel }}: "{{ scope.inputValue }}"
              </q-item-label>
            </q-item-section>
          </q-item>
          <q-item v-else>
            <q-item-section class="text-grey">No results</q-item-section>
          </q-item>
        </slot>
        <slot name="after--no-option" v-bind="scope || {}" />
      </template>

      <template v-else-if="slot === 'append' && choose.canCreate">
        <slot name="before--append" v-bind="scope || {}" />
        <slot name="append" v-bind="scope || {}">
          <!-- CREATE NEW PLUS ICON -->
          <q-btn round dense flat icon="add" @click.stop.prevent="choose.createOption()">
            <q-tooltip anchor="top middle" self="bottom middle" :offset="[0, 5]">
              {{ choose.createLabel }}
            </q-tooltip>
          </q-btn>
        </slot>
        <slot name="after--append" v-bind="scope || {}" />
      </template>

      <!-- Any other QSelect slot the consumer supplied: forward it wrapped. -->
      <template v-else>
        <slot :name="`before--${slot}` as any" v-bind="scope || {}" />
        <slot :name="slot as any" v-bind="scope || {}" />
        <slot :name="`after--${slot}` as any" v-bind="scope || {}" />
      </template>
    </template>
  </q-select>
</template>

<style>
/*
 * Hint spacing fix: QSelect renders .q-field__bottom flush against the
 * control; give the hint native-feeling breathing room.
 */
.ivue-choose .q-field__bottom {
  padding-top: 6px;
  min-height: 22px;
}

.ivue-choose__selected {
  margin-right: 4px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ivue-choose .q-chip--dense {
  height: auto;
  border-radius: v-bind('choose.chipBorderRadius');
  background: #f3f3f3;
  margin: 3px 3px 3px 0;
  border: 1px solid #dae6ea;
  padding: 3px 12px;
}

.ivue-choose .q-chip.ivue-chip__singular {
  background: none;
  border: none;
  padding-left: 4px;
}

/* avatar chips carry their own image at the left edge — tight left padding */
.ivue-choose .q-chip--dense.contact-field__chip {
  padding: 3px 10px 3px 4px;
}

/* the to-be-created value renders as a round chip-like token */
.ivue-choose__create-term {
  display: inline-block;
  padding: 1px 12px;
  margin-left: 4px;
  border: 1px solid currentColor;
  border-radius: 50px;
  font-weight: 500;
}

/* Quasar reserves 56px for icon sections — a comfortable 10px gap instead */
.ivue-choose__option .q-item__section--avatar {
  min-width: 0;
  padding-right: 10px;
}

.ivue-choose__variants {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 4px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.ivue-choose__variant--active {
  background: rgba(0, 0, 0, 0.06);
}

.ivue-choose__variant-btn {
  font-size: 13px;
  padding: 7px 16px;
}
.ivue-choose__variant-btn .q-icon {
  font-size: 18px;
  margin-right: 6px;
}

</style>

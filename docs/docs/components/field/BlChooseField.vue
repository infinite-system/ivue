<!-- eslint-disable @typescript-eslint/no-unused-vars -->
<script lang="ts">
import { QSelect, QTooltip, QChip, QBtn, QIcon, type QSelectSlots } from 'quasar';

import BlChooseFieldClass from '@/components/field/BlChooseFieldClass';
import {
  BlChooseFieldSlots,
  chooseFieldEmits,
  chooseFieldProps,
} from '@/components/field/BlChooseFieldProps';
import DefaultOption from '@/components/option/DefaultOption.vue';
import { type IVue, ivue } from 'ivue';

/**
 * NOTE: This <script> section above the <script setup> is essential for
 * declaring the dynamic properties and emits properly
 * to be able to work in all modes, for example test mode
 * was not working without this.
 *
 * This is also a correct way according to the eslint rules.
 * @see https://eslint.vuejs.org/rules/valid-define-props.html
 *
 * IMPORTANT: Do not declare ref or reactive variables in this scope.
 */
</script>
<script lang="ts" setup>
const props = defineProps(chooseFieldProps);
const emit = defineEmits(chooseFieldEmits);

/** Runner */
const runner = (props.runner ||
  BlChooseFieldClass) as typeof BlChooseFieldClass;

/** IVUE instance */
const choose =
  typeof props.runner === 'object'
    ? (props.runner as IVue<typeof BlChooseFieldClass>)
    : ivue(runner, props, emit);

const { input, chipBorderRadius, inputPaddingTop } = choose.toRefs([
  /** Ref */
  'input',
  /** CSS Styles */
  'chipBorderRadius',
  'inputPaddingTop',
]);

/** Slots */
const slots = defineSlots<BlChooseFieldSlots>();
const activeSlots = new Set(
  Object.keys(slots).concat([
    /** Slots defined in this component. */
    'prepend',
    'selected-item',
    'before-options',
    'option',
    'no-option',
    'append',
  ])
);
/** Expose */
defineExpose<IVue<typeof BlChooseFieldClass>>(choose);
emit('expose', choose);
</script>
<template>
  <q-select
    v-show="!choose.hidden"
    ref="input"
    :model-value="choose.modelValue"
    :label="choose.label"
    :dense="choose.dense"
    :filled="choose.filled"
    :outlined="choose.outlined"
    :readonly="choose.readonly"
    :disable="choose.disable"
    :label-color="choose.labelColor"
    :color="choose.color"
    :hint="choose.hint"
    :placeholder="choose.placeholder"
    :rules="choose.validationRules"
    :options-cover="choose.optionsCover"
    lazy-rules
    :dropdown-icon="choose.dropdownIcon"
    :hide-dropdown-icon="choose.hideDropdownIcon"
    hide-bottom-space
    emit-value
    map-options
    :clear-icon="choose.clearIcon"
    :clearable="choose.clearable"
    :use-input="choose.useInput"
    :multiple="choose.multiple"
    :options="choose.filteredOptions"
    :options-selected-class="choose.optionsSelectedClass"
    :use-chips="choose.useChips"
    :new-value-mode="choose.newValueMode"
    :input-debounce="choose.inputDebounce"
    class="bl-choose"
    :class="choose.class"
    :style="choose.style"
    :option-value="choose.optionValue"
    @focus="(event) => choose.onFocus(event)"
    @filter="(inputValue, doneFn) => choose.onFilter(inputValue, doneFn)"
    @input-value="(value) => choose.onInputValue(value)"
    @remove="(details) => choose.onRemove(details)"
    @update:model-value="(value) => choose.onUpdateModelValue(value)"
    @virtual-scroll="(details: any) => choose.onVirtualScroll(details)"
  >
    <!-- This makes all slots from QSelect extensible -->
    <template v-for="slot of activeSlots" :key="slot" #[slot]="scope">
      <template v-if="slot === 'prepend'">
        <slot :key="slot" name="before--prepend" v-bind="scope" />
        <slot :key="slot" :name="slot" v-bind="scope">
          <q-icon v-if="choose.icon" :name="choose.icon" />
        </slot>
        <slot :key="slot" name="after--prepend" v-bind="scope" />
      </template>
      <template v-else-if="slot === 'selected-item'">
        <slot :key="slot" name="before--selected-item" v-bind="scope" />
        <slot :key="slot" :name="slot" v-bind="scope">
          <q-chip
            v-if="choose.useChips && choose.canViewOption(scope)"
            :key="scope.index"
            :removable="choose.canRemoveChip"
            dense
            size="14px"
            icon-remove="close"
            :tabindex="scope.tabindex"
            color="white"
            text-color="primary"
            :class="choose.chipClass"
            :draggable="choose.draggable"
            @dragstart="(event: DragEvent) => choose.onDragStart(event, scope.index)"
            @dragover="(event: DragEvent) => choose.onDragOver(event)"
            @dragenter="(event: DragEvent) => choose.onDragEnter(event)"
            @dragleave="(event: DragEvent) => choose.onDragLeave(event)"
            @dragend="(event: DragEvent) => choose.onDragEnd(event)"
            @drop="(event: DragEvent) => choose.onDrop(event, scope.index)"
            @remove="() => choose.onRemoveChip(scope)"
          >
            <!-- CHIP SELECTED ITEM -->
            <DefaultOption
              :model-value="choose.modelValue"
              :scope="scope"
              :opt="scope.opt"
              :index="scope.index"
              :item-props="scope.itemProps"
              :component="choose.optionComponent"
              item-class="q-py-xs q-px-none"
              :params="choose.props"
              mode="selected-item-chip"
              :comma-separated="false"
            />
          </q-chip>
          <!-- NON-CHIP SELECTED ITEM -->
          <DefaultOption
            v-else-if="choose.canViewOption(scope)"
            :model-value="choose.modelValue"
            :scope="scope"
            :opt="scope.opt"
            :index="scope.index"
            :item-props="scope.itemProps"
            :component="choose.optionComponent"
            item-class="q-pl-none q-pr-xs q-py-none"
            :params="choose.props"
            mode="selected-item"
            :comma-separated="true"
          />
        </slot>
        <slot :key="slot" name="after--selected-item" v-bind="scope" />
      </template>
      <template v-else-if="slot === 'before-options'">
        <slot :key="slot" name="before--before-options" v-bind="scope" />
        <!-- VARIANTS -->
        <slot :key="slot" :name="slot" v-bind="scope">
          <div v-if="choose.variants.length > 1">
            <q-btn
              v-for="(variant, index) in choose.variants"
              :key="index"
              flat
              square
              :color="choose.activeVariantButtonColor(index)"
              :text-color="choose.activeVariantButtonTextColor(index)"
              :class="choose.activeVariantButtonClass(index)"
              :style="choose.activeVariantButtonStyle(index)"
              :icon="variant?.icon"
              @click="choose.setVariantByIndex(index)"
              >{{ variant.label }}</q-btn
            >
          </div>
        </slot>
        <slot :key="slot" name="after--before-options" v-bind="scope" />
      </template>
      <template v-else-if="slot === 'option'">
        <slot :key="slot" name="before--option" v-bind="scope" />
        <!-- OPTION -->
        <slot :key="slot" :name="slot" v-bind="scope">
          <DefaultOption
            :scope="scope"
            :opt="scope.opt"
            :model-value="choose.modelValue"
            :index="scope.index"
            :item-props="scope.itemProps"
            :component="choose.optionComponent"
            item-class="q-py-md q-px-md"
            :params="choose.props"
            mode="option"
            :comma-separated="false"
          />
        </slot>
        <slot :key="slot" name="after--option" v-bind="scope" />
      </template>
      <template v-else-if="slot === 'no-option'">
        <slot :key="slot" name="before--no-option" v-bind="scope" />
        <!-- NO OPTION VARIANTS -->
        <slot :key="slot" :name="slot" v-bind="scope">
          <div v-if="choose.variants.length">
            <q-btn
              v-for="(variant, index) in choose.variants"
              :key="index"
              flat
              square
              :color="choose.activeVariantButtonColor(index)"
              :text-color="choose.activeVariantButtonTextColor(index)"
              :class="choose.activeVariantButtonClass(index)"
              :style="choose.activeVariantButtonStyle(index)"
              :icon="variant?.icon"
              @click="choose.setVariantByIndex(index)"
              >{{ variant.label }}</q-btn
            >
          </div>
          <!-- NO OPTION CONTENT -->
          <DefaultOption
            :scope="scope"
            :opt="scope.opt"
            :model-value="choose.modelValue"
            :item-props="scope.itemProps"
            :component="choose.optionComponent"
            item-class="q-py-md q-px-md"
            :params="choose.props"
            mode="no-option"
            :comma-separated="false"
          />
        </slot>
        <slot :key="slot" name="after--no-option" v-bind="scope" />
      </template>
      <template v-else-if="slot === 'append' && choose.createEntity">
        <slot :key="slot" name="before--append" v-bind="scope" />
        <!-- CREATE NEW PLUS ICON -->
        <slot :key="slot" :name="slot" v-bind="scope"
          ><q-btn
            round
            dense
            flat
            icon="add"
            @click.stop.prevent="() => choose.showCreateDialog()"
            ><q-tooltip
              anchor="top middle"
              self="bottom middle"
              :offset="[0, 5]"
              class="bg-grey-7"
              >{{ choose.createLabel }}</q-tooltip
            ></q-btn
          >
        </slot>
        <slot :key="slot" name="after--append" v-bind="scope" />
      </template>
      <!--- Handle all slots that are defined on QSelectSlots but not defined in this component. -->
      <template v-else>
        <slot
          :key="slot"
          :name="`before--${slot as keyof QSelectSlots}`"
          v-bind="scope"
        ></slot>
        <slot
          :key="slot"
          :name="(slot as keyof BlChooseFieldSlots)"
          v-bind="scope"
        ></slot>
        <slot
          :key="slot"
          :name="`after--${slot as keyof QSelectSlots}`"
          v-bind="scope"
        ></slot>
      </template>
    </template>
  </q-select>
</template>
<style lang="scss">
// Needed to make the height of select and regular text fields the same height
.bl-choose {
  &.q-field--dense .q-field__control,
  &.q-field--dense .q-field__marginal {
    min-height: 38px;
  }
  .q-field__bottom {
    min-height: auto !important;
    padding: 0;
  }

  &.q-field--readonly .q-field__control:before {
    border-bottom-style: dashed !important;
  }

  &.q-field--dense .q-field__marginal {
    height: auto;
  }
  
  &.q-field--auto-height.q-field--dense.q-field--labeled .q-field__native {
    min-height: 20px;
  }

  .q-field__input.q-placeholder[aria-controls="null_lb"] {
    width:0;
    display:none;
  }
}
.bl-choose .q-chip--dense {
  height: auto;
  border-radius: v-bind(chipBorderRadius);
  background: #f3f3f3;
  margin: 3px 3px 3px 0;
  border: 1px solid #dae6ea;
}

.bl-choose .q-chip.q-chip__singular {
  background: none !important;
  border: none;
  margin: 3px 3px 3px 0;
  padding-left: 0px;
}

.bl-choose.q-field.q-field--auto-height.q-field--dense.q-field--labeled,
.q-field--readonly.bl-choose.q-field.q-field--auto-height.q-field--dense.q-field--labeled {
  .q-field__control-container {
    padding-top: v-bind(inputPaddingTop) !important;
  }
}

.bl-choose .q-chip__drag-hover {
  transition: 0.5s;
  background: #d9e9fb !important;
  border: 1px solid #9bb7d7;
}

.bl-choose .q-chip.q-chip__draggable {
  transition: 0.5s;
  cursor: grab;
}

.bl-choose .q-chip--dense:hover {
  transition: 0.5s;
  background: #f0f6f8;
}

.bl-choose .q-chip:active:hover {
  cursor: grabbing !important;
}

.bl-choose .q-chip__drag-hide {
  transition: 0.01s;
  cursor: grabbing;
  opacity: 0.4;
}

.bl-choose .q-item__label + .q-item__label {
  margin-top: 1px;
}

.bl-choose.q-field--error {
  .q-field__bottom {
    min-height: auto !important;
    padding: 8px 12px 0;
  }
}


</style>

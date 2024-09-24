<script lang="ts">
import { ivue } from 'ivue';

import { contactFieldEmits, contactFieldProps } from './BlChooseContactFieldProps';
import BlChooseField from './BlChooseField.vue';
import { BlChooseContactFieldClass } from './BlChooseFieldClass';
import { BlChooseFieldSlots } from './BlChooseFieldProps';
import { IVue } from 'ivue';

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
/** Props & Emits */
const props = defineProps(contactFieldProps);
const emit = defineEmits(contactFieldEmits);

/** IVUE instance. */
const chooseContact = ivue(BlChooseContactFieldClass, props, emit);

/** Slots */
const slots = defineSlots<BlChooseFieldSlots>();
const activeSlots = new Set(Object.keys(slots));

/** Expose. */
defineExpose<IVue<typeof BlChooseContactFieldClass>>(chooseContact);
emit('expose', chooseContact);
</script>
<template>
  <BlChooseField :model-value="modelValue" :runner="chooseContact">
    <!-- This borrows all slots from BlChooseField  -->
    <template v-for="slot of activeSlots" :key="slot" #[slot]="scope">
      <slot
        :key="slot"
        :name="(slot as keyof BlChooseFieldSlots)"
        v-bind="scope"
      ></slot>
    </template>
  </BlChooseField>
</template>

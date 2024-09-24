<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card
      :style="{
        width: `${width}px`,
        maxWidth: '100%',
      }"
    >
      <q-input v-model="email" label="Email" />
      <q-input v-model="firstName" label="First Name" />
      <q-input v-model="lastName" label="Last Name" />
      <q-input v-model="projectContactType" label="Project Contact Type" />
    </q-card>
  </q-dialog>
</template>

<script lang="ts" setup>
import { QDialog, QCard, QInput } from 'quasar';
import { ref } from 'vue';
import { useDialogPluginComponent } from 'quasar';

import { IKeyValue } from '@/types/core';

// Props
withDefaults(
  defineProps<{
    data?: IKeyValue;
    title?: string;
    cancelLabel?: string;
    submitLabel?: string;
    highlightChanges?: boolean;
    width?: number;
    hideCancel?: boolean;
  }>(),
  {
    data: () => ({}),
    title: '',
    submitLabel: 'Submit',
    cancelLabel: 'Cancel',
    actions: () => [],
    width: 400,
    hideCancel: false,
  }
);

// Emits
defineEmits([
  // REQUIRED; need to specify some events that your
  // component will emit through useDialogPluginComponent()
  ...useDialogPluginComponent.emits,
]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
  useDialogPluginComponent();

const submitSuccess = (data: IKeyValue) => {
  onDialogOK(data);
};

const cancelClicked = (evt: Event) => {
  onDialogCancel();
};

const actionClicked = (data: IKeyValue) => {
  onDialogOK(data);
};

const email = ref('');
const firstName = ref('');
const lastName = ref('');
const projectContactType = ref('');
</script>

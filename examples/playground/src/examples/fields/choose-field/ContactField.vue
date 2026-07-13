<script lang="ts" setup>
// ContactField — ChooseField preconfigured for the '/contact' endpoint,
// with avatar-decorated options and chips in two display modes:
//   full (default): avatar + name + email in options AND selected chips
//   compact:        smaller avatar, name only, denser rows
import { QChip, QItem, QItemLabel, QItemSection } from 'quasar';
import { computed } from 'vue';

import ChooseField from './ChooseField.vue';
import ContactAvatar from './ContactAvatar.vue';
import {
  contactFieldEmits,
  contactFieldProps,
} from './ContactFieldProps';

const props = defineProps(contactFieldProps);
const emit = defineEmits(contactFieldEmits);

/** Everything except our own `compact` passes straight into ChooseField. */
const chooseProps = computed(() => {
  const { compact, modelValue, ...passthrough } = props;
  return passthrough;
});

const avatarSize = computed(() => (props.compact ? 20 : 32));
</script>

<template>
  <ChooseField
    :class="props.compact ? 'contact-field--compact' : 'contact-field--full'"
    v-bind="chooseProps"
    :model-value="props.modelValue"
    @update:model-value="(value: any) => emit('update:model-value', value)"
    @remove="(details: any) => emit('remove', details)"
  >
    <!-- CONTACT OPTION: avatar + name (+ email in full mode) -->
    <template #option="scope">
      <q-item v-bind="scope.itemProps" :dense="props.compact">
        <q-item-section avatar>
          <ContactAvatar :name="scope.opt?.name ?? ''" :size="avatarSize" />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ scope.opt?.name }}</q-item-label>
          <q-item-label v-if="!props.compact && scope.opt?.email" caption>
            {{ scope.opt.email }}
          </q-item-label>
        </q-item-section>
      </q-item>
    </template>

    <!-- SELECTED CHIP: avatar + name (+ email in full mode) -->
    <template #selected-item="scope">
      <q-chip
        removable
        dense
        :size="props.compact ? '12px' : '14px'"
        icon-remove="close"
        :tabindex="scope.tabindex"
        color="white"
        text-color="primary"
        class="contact-field__chip"
        @remove="() => scope.removeAtIndex(scope.index)"
      >
        <ContactAvatar
          :name="scope.opt?.name ?? ''"
          :size="props.compact ? 16 : 22"
          class="contact-field__chip-avatar"
        />
        <span class="contact-field__chip-name">{{ scope.opt?.name }}</span>
        <span v-if="!props.compact && scope.opt?.email" class="contact-field__chip-email">
          {{ scope.opt.email }}
        </span>
      </q-chip>
    </template>
  </ChooseField>
</template>

<style>
.contact-field__chip {
  padding: 3px 8px 3px 3px;
}

.contact-field__chip-avatar {
  margin-right: 6px;
}

.contact-field__chip-name {
  font-weight: 500;
}

.contact-field__chip-email {
  margin-left: 6px;
  opacity: 0.65;
  font-size: 0.85em;
}

.contact-field--compact .q-field__control {
  min-height: 36px;
}
</style>

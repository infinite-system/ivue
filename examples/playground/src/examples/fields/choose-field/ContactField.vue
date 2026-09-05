<script lang="ts" setup>
// ContactField — ChooseField SUBCLASSED for the '/contact' endpoint,
// with avatar-decorated options and chips in two display modes:
//   full (default): avatar + name + email in options AND selected chips
//   compact:        smaller avatar, name only, denser rows
// The wrapper constructs the SUBCLASS instance with its own props and
// emit, then hands it to the base SFC via `runner` (ported v1 mechanism):
// one object drives the base's behavior AND this template's decoration.
import { QChip, QItem, QItemLabel, QItemSection } from 'quasar';

import ChooseField from './ChooseField.vue';
import ContactAvatar from './ContactAvatar.vue';
import { ContactField } from './ContactField';

const props = defineProps(ContactField.Class.props);
const emit = defineEmits(ContactField.Class.emits);

const field = new ContactField.Class(props, emit);

defineExpose(field as ContactField.Instance);
</script>

<template>
  <ChooseField
    :class="field.rootClass"
    :model-value="props.modelValue"
    :runner="field"
  >
    <!-- CONTACT OPTION: avatar + name (+ email in full mode) -->
    <template #option="scope">
      <q-item
        v-bind="scope.itemProps"
        :dense="field.compact"
        class="contact-field__option"
        :class="{ 'contact-field__option--compact': field.compact }"
      >
        <q-item-section avatar>
          <ContactAvatar :name="scope.opt?.name ?? ''" :size="field.avatarSize" />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ scope.opt?.name }}</q-item-label>
          <q-item-label v-if="field.showEmail(scope.opt)" caption>
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
        :size="field.chipSize"
        icon-remove="close"
        :tabindex="scope.tabindex"
        color="white"
        text-color="dark"
        class="contact-field__chip"
        @remove="() => scope.removeAtIndex(scope.index)"
      >
        <ContactAvatar
          :name="scope.opt?.name ?? ''"
          :size="field.chipAvatarSize"
          class="contact-field__chip-avatar"
        />
        <span class="contact-field__chip-name">{{ scope.opt?.name }}</span>
        <span v-if="field.showEmail(scope.opt)" class="contact-field__chip-email">
          {{ scope.opt.email }}
        </span>
      </q-chip>
    </template>
  </ChooseField>
</template>

<style>
/* Quasar reserves 56px for avatar sections — far too much air between the
   avatar and the name. Tighten it; tighter still in compact mode. */
.contact-field__option {
  padding-left: 10px;
}
.contact-field__option .q-item__section--avatar {
  min-width: 0;
  padding-right: 10px;
}
.contact-field__option--compact .q-item__section--avatar {
  padding-right: 7px;
}

.contact-field__chip {
  padding: 4px 10px 4px 4px;
  /* never wider than the field — long emails ellipsize instead */
  max-width: 100%;
}
.contact-field__chip .q-chip__content {
  min-width: 0;
}

.contact-field__chip-avatar {
  margin-right: 6px;
}

.contact-field__chip-name {
  font-weight: 500;
  white-space: nowrap;
}

.contact-field__chip-email {
  margin-left: 6px;
  opacity: 0.65;
  font-size: 0.85em;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.contact-field--compact .q-field__control {
  min-height: 36px;
}
</style>

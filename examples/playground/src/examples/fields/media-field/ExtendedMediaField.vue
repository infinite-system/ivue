<script lang="ts" setup>
// ExtendedMediaField.vue — demonstrates BOTH extension mechanisms at once:
//   1. CLASS extension: `:runner="ExtendedMediaField.Class"` makes the base
//      MediaField.vue construct the subclass — every slot receives it as
//      `field`, so injected templates call the subclass's extra members.
//   2. TEMPLATE injection: the `before--`/`after--` slots (ExtendSlots) add
//      markup at the base template's extension points — no template copy.
import { QBadge, QBtn, QTooltip } from 'quasar';

import { ExtendedMediaField } from './ExtendedMediaField';
import MediaField from './MediaField.vue';
import {
  mediaFieldEmits,
  mediaFieldProps,
  type MediaFieldEmits,
} from './MediaFieldProps';

const props = defineProps(mediaFieldProps);
/** Object-declared emits — ExtractEmitTypes derives the callable type. */
const emit = defineEmits(mediaFieldEmits) as MediaFieldEmits;
</script>

<template>
  <MediaField
    v-bind="props"
    :runner="ExtendedMediaField.Class"
    @update:model-value="(value) => emit('update:modelValue', value)"
    @uploaded="(rows) => emit('uploaded', rows)"
    @removed="(row) => emit('removed', row)"
    @error="(message) => emit('error', message)"
  >
    <!-- SORT TOGGLE + TOTAL SIZE — injected after the base header -->
    <template #after--header="{ field }">
      <div v-if="field.hasFiles" class="extended-media__toolbar">
        <q-btn
          dense
          flat
          size="11px"
          :icon="field.sortModeIcon"
          :label="field.sortModeLabel"
          @click="field.toggleSortMode()"
        >
          <q-tooltip class="bg-grey-9">Toggle sort order</q-tooltip>
        </q-btn>
        <q-badge
          color="grey-3"
          text-color="black"
          :label="'Total ' + field.totalSizeLabel"
        />
      </div>
    </template>

    <!-- COPY-URL ACTION — appended to each item's hover actions -->
    <template #after--item-actions="{ row, field }">
      <q-btn
        dense
        flat
        round
        size="10px"
        :icon="field.copiedId.value === row.id ? 'check' : 'link'"
        color="white"
        @click="field.copyUrl(row)"
      >
        <q-tooltip class="bg-grey-9">
          {{ field.copiedId.value === row.id ? 'Copied!' : 'Copy URL' }}
        </q-tooltip>
      </q-btn>
    </template>

    <!-- DIMENSIONS BADGE + CAPTION EDITOR — appended after each item -->
    <template #after--item="{ row, field }">
      <div class="extended-media__item-extras">
        <q-badge
          v-if="field.dimensionsOf(row)"
          color="grey-3"
          text-color="black"
          class="extended-media__dimensions"
          :label="field.dimensionsOf(row)"
        />
        <input
          v-if="field.captionId.value === row.id"
          v-model="field.captionDraft.value"
          class="extended-media__caption-input"
          placeholder="Caption"
          @keydown.enter.prevent="field.commitCaption()"
          @keydown.esc="field.cancelCaption()"
          @blur="field.commitCaption()"
        />
        <div
          v-else-if="field.canRenameCaption"
          class="extended-media__caption"
          :class="{ 'extended-media__caption--empty': !row.caption }"
          @click="field.startCaption(row)"
        >
          {{ row.caption || 'Add caption…' }}
        </div>
        <div v-else-if="row.caption" class="extended-media__caption">
          {{ row.caption }}
        </div>
      </div>
    </template>
  </MediaField>
</template>

<style scoped>
.extended-media__toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 6px;
}

.extended-media__item-extras {
  padding: 2px 2px 0;
}

.extended-media__dimensions {
  font-size: 10px;
}

.extended-media__caption {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.55);
  cursor: text;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.extended-media__caption--empty {
  color: rgba(0, 0, 0, 0.3);
  font-style: italic;
}

.extended-media__caption-input {
  width: 100%;
  font-size: 11px;
  background: none;
  outline: none;
  border: 0;
  border-bottom: 1px solid var(--q-primary, #1976d2);
  padding: 0 0 1px;
}
</style>

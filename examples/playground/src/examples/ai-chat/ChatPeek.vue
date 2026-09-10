<script setup lang="ts">
import { Peek } from './Peek';

const props = defineProps<Peek.Props>();

const model = new ((props.kit?.namespace.Class as typeof Peek.Class | undefined) ?? Peek.Class)(props);
const {
  // state refs
  open,
  // element refs
  scroller,
} = model;
// the mini scroller walks the thread's own rows — the chat's ref, bound as v-model
const { rows } = model.chat;

defineExpose(model as Peek.Instance);
</script>

<template>
  <Transition name="ac-peek">
    <aside v-if="open" class="ac-peek" :style="model.style">
      <header class="ac-peek-head">
        <span class="ac-peek-pos">{{ model.positionLabel }}</span>
        <span class="ac-peek-date">{{ model.dateLabel }}</span>
        <span class="ac-peek-pct">{{ model.percentLabel }}</span>
      </header>
      <div class="ac-peek-list" :style="model.listStyle">
        <component :is="model.kit.Scroller.vue" ref="scroller" :kit="model.kit.Scroller" :auto-repeat="false" v-model="rows" :assumed-size="30" :padding-quantity="4">
          <template #item="{ item }">
            <div class="ac-peek-row" :class="model.rowClass(item)" @click="model.select(item)">
              <span class="ac-peek-role">{{ model.roleMark(item) }}</span>
              <span class="ac-peek-text">{{ model.previewText(item) }}</span>
              <span class="ac-peek-time">{{ model.timeLabel(item) }}</span>
            </div>
          </template>
        </component>
      </div>
      <span class="ac-peek-tail" aria-hidden="true"></span>
    </aside>
  </Transition>
</template>

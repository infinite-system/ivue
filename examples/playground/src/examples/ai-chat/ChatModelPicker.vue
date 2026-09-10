<script setup lang="ts">
import { ModelPicker } from './ModelPicker';

const props = defineProps<ModelPicker.Props>();

const model = new ((props.kit?.namespace.Class as typeof ModelPicker.Class | undefined) ?? ModelPicker.Class)(props);
const {
  // state refs
  open,
  // element refs
  rootElement,
} = model;
</script>

<template>
  <div ref="rootElement" class="ac-picker" :class="model.menuClass">
    <button type="button" class="ac-model" :aria-expanded="open" :title="model.composer.modelHint" @click="model.toggle()" @keydown="model.onKeydown($event)">
      <span class="ac-model-dot" aria-hidden="true"></span>
      <svg class="ac-model-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="model.pickedIcon" /></svg>
      <span class="ac-model-name">{{ model.pickedLabel }}</span>
      <span class="ac-model-caret" aria-hidden="true">▾</span>
    </button>
    <div v-if="open" class="ac-picker-menu" role="listbox">
      <div class="ac-picker-title">Model</div>
      <button v-for="option in model.models" :key="option.id" type="button" class="ac-picker-card" :class="model.cardClass(option)" role="option" :aria-selected="model.isPicked(option)" @click="model.pick(option)">
        <svg class="ac-picker-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="model.iconFor(option)" /></svg>
        <span class="ac-picker-body">
          <span class="ac-picker-head">
            <span class="ac-picker-name">{{ option.label }}</span>
            <span class="ac-picker-detail">{{ option.detail }}</span>
          </span>
          <span class="ac-picker-meter" :title="model.speedLabel(option)">
            <span class="ac-picker-track"><span class="ac-picker-bar ac-picker-speed" :style="model.speedStyle(option)"></span></span>
            <span class="ac-picker-meter-label">{{ model.speedLabel(option) }}</span>
          </span>
          <span class="ac-picker-meter" :title="model.firstTokenLabel(option)">
            <span class="ac-picker-track"><span class="ac-picker-bar ac-picker-wait" :style="model.waitStyle(option)"></span></span>
            <span class="ac-picker-meter-label">{{ model.firstTokenLabel(option) }}</span>
          </span>
        </span>
        <span class="ac-picker-check" aria-hidden="true">✓</span>
      </button>
    </div>
  </div>
</template>

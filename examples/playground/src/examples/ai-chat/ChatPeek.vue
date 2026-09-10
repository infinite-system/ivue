<script setup lang="ts">
import { Peek } from './Peek';

const props = defineProps<Peek.Props>();

const model = new ((props.kit?.namespace.Class as typeof Peek.Class | undefined) ?? Peek.Class)(props);
const {
  // state refs
  open,
  query,
  // computed refs
  rows,
  // element refs
  scroller,
  searchElement,
} = model;

defineExpose(model as Peek.Instance);
</script>

<template>
  <Transition name="ac-peek">
    <aside v-if="open" class="ac-peek" :style="model.style">
      <div class="ac-index-search ac-peek-search">
        <svg class="ac-search-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="model.searchIcon" /></svg>
        <input ref="searchElement" v-model="query" type="search" class="ac-search" placeholder="Search the thread…" aria-label="Search the thread" @focus="model.onSearchFocus()" @blur="model.onSearchBlur()" @keydown="model.onSearchKeydown($event)" />
        <button v-if="query" type="button" class="ac-link" @click="model.clearQuery()">clear</button>
      </div>
      <div class="ac-peek-filters">
        <div class="ac-seg" role="group" aria-label="Role">
          <button v-for="option in model.roleOptions" :key="option.value" type="button" :class="{ 'ac-on': model.isRole(option.value) }" @click="model.setRole(option.value)">{{ option.label }}</button>
        </div>
        <div class="ac-seg" role="group" aria-label="Tool calls">
          <button v-for="option in model.toolOptions" :key="option.value" type="button" :class="{ 'ac-on': model.isTools(option.value) }" @click="model.setTools(option.value)">{{ option.label }}</button>
        </div>
      </div>
      <header class="ac-peek-head">
        <span class="ac-peek-pos">{{ model.positionLabel }}</span>
        <span class="ac-peek-date">{{ model.dateLabel }}</span>
        <span class="ac-peek-match">{{ model.matchLabel }}</span>
        <span class="ac-peek-pct">{{ model.percentLabel }}</span>
      </header>
      <div class="ac-peek-list" :style="model.listStyle">
        <component :is="model.kit.Scroller.vue" ref="scroller" :kit="model.kit.Scroller" :auto-repeat="false" scrollbar :model-value="rows" :assumed-size="30" :padding-quantity="4">
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

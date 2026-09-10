<script setup lang="ts">
import { Index } from './Index';

const props = defineProps<Index.Props>();

const model = new ((props.kit?.namespace.Class as typeof Index.Class | undefined) ?? Index.Class)(props);
const {
  // state refs
  query,
  exportForm,
  // computed refs
  rows,
  // element refs
  scroller,
  searchElement,
} = model;
</script>

<template>
  <section class="ac-index" tabindex="0" @keydown="model.onKeydown($event)">
    <header class="ac-index-head">
      <div class="ac-index-title">
        <strong>Index</strong>
        <span class="ac-muted">{{ model.countLabel }}</span>
        <button type="button" class="ac-link ac-index-close" @click="chat.closeSidebar()">close</button>
      </div>
      <div class="ac-index-filters">
        <div class="ac-seg" role="group" aria-label="Role">
          <button v-for="option in model.roleOptions" :key="option.value" type="button" :class="{ 'ac-on': model.isRole(option.value) }" @click="model.setRole(option.value)">{{ option.label }}</button>
        </div>
        <div class="ac-seg" role="group" aria-label="Tool calls">
          <button v-for="option in model.toolOptions" :key="option.value" type="button" :class="{ 'ac-on': model.isTools(option.value) }" @click="model.setTools(option.value)">{{ option.label }}</button>
        </div>
        <div class="ac-seg" role="group" aria-label="Order">
          <button v-for="option in model.orderOptions" :key="option.value" type="button" :class="{ 'ac-on': model.isOrder(option.value) }" @click="model.setOrder(option.value)">{{ option.label }}</button>
        </div>
      </div>
      <div class="ac-index-search">
        <svg class="ac-search-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="model.searchIcon" /></svg>
        <input ref="searchElement" v-model="query" type="search" class="ac-search" placeholder="Search messages…" aria-label="Search messages" />
        <button v-if="query" type="button" class="ac-link" @click="model.clearQuery()">clear</button>
      </div>
      <div class="ac-index-select">
        <label class="ac-check-all">
          <input type="checkbox" :checked="model.allShownSelected" @change="model.toggleAllShown()" />
          <span>{{ model.selectAllLabel }}</span>
        </label>
        <span class="ac-muted">{{ model.selectedLabel }}</span>
        <button v-if="model.hasSelection" type="button" class="ac-link" @click="model.clearSelection()">clear</button>
      </div>
    </header>

    <div class="ac-index-list">
      <component :is="model.kit.Scroller.vue" ref="scroller" :kit="model.kit.Scroller" scrollbar :model-value="rows" :assumed-size="46" :padding-quantity="10" :selection-text="model.rowText">
        <template #item="{ item }">
          <div class="ac-ix-row" :class="model.rowClass(item)" @click="model.onRowClick(item, $event)" @dblclick="model.onRowDoubleClick(item)">
            <input type="checkbox" class="ac-ix-check" :checked="model.isSelected(item)" @click="model.onRowCheck(item, $event)" />
            <span class="ac-ix-role" :class="model.roleClass(item)">{{ model.roleMark(item) }}</span>
            <span class="ac-ix-text">{{ model.previewText(item) }}</span>
            <span v-if="model.toolsLabel(item)" class="ac-ix-tools">{{ model.toolsLabel(item) }}</span>
            <span class="ac-ix-time">{{ model.timeLabel(item) }}</span>
            <button type="button" class="ac-ix-go" title="Show in the chat" @click.stop="model.seek(item)">→</button>
          </div>
        </template>
      </component>
    </div>

    <footer class="ac-index-foot">
      <select v-model="exportForm" class="ac-select" aria-label="Export form">
        <option v-for="option in model.exportOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
      <button type="button" class="ac-btn ac-btn-primary" :disabled="!model.hasSelection" @click="model.download()">{{ model.exportLabel }}</button>
      <button type="button" class="ac-btn" :disabled="!model.hasSelection" @click="model.copyMarkdown()">{{ model.copyLabel }}</button>
      <p class="ac-index-hint">click selects · shift-click a range · ctrl-click toggles · ↑↓ move · space picks · enter shows</p>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { SidebarFiles } from './Sidebar.Files';

const props = defineProps<SidebarFiles.Props>();

const model = new (
  (props.kit?.namespace?.Class as typeof SidebarFiles.Class | undefined) ?? SidebarFiles.Class
)(props);
const {
  // state refs
  query,
  // computed refs
  rows,
  // element refs
  scroller,
  searchElement
} = model;
</script>

<template>
  <section class="ac-panel-pane ac-files">
    <header class="ac-pane-head">
      <strong>Files</strong>
      <span class="ac-muted">{{ model.countLabel }}</span>
      <span class="ac-muted ac-pane-sub">{{ model.coverageLabel }}</span>
      <button type="button" class="ac-close" title="Close" @click="model.close()">
        <svg class="ac-close-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path :d="model.closeIcon" />
        </svg>
      </button>
    </header>
    <div class="ac-index-search ac-files-search">
      <svg class="ac-search-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path :d="model.searchIcon" />
      </svg>
      <input
        ref="searchElement"
        v-model="query"
        type="search"
        class="ac-search"
        placeholder="Search files…"
        aria-label="Search files"
      />
      <button v-if="query" type="button" class="ac-link" @click="model.clearQuery()">clear</button>
    </div>
    <div class="ac-index-filters ac-files-filters">
      <div class="ac-seg" role="group" aria-label="Touched by">
        <button
          v-for="option in model.kindOptions"
          :key="option.value"
          type="button"
          :class="{ 'ac-on': model.isKind(option.value) }"
          @click="model.setKind(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>
    <p v-if="model.hasNoMatch" class="ac-pane-empty">No loaded file matches.</p>
    <p v-else-if="!model.hasFiles" class="ac-pane-empty">
      No file has been read, edited or written in the messages loaded so far. Scroll the thread and
      the list fills.
    </p>
    <div v-else class="ac-file-list">
      <component
        :is="model.kit.Scroller.view"
        ref="scroller"
        :kit="model.kit.Scroller"
        scrollbar
        :auto-repeat="false"
        :model-value="rows"
        :assumed-size="48"
        :padding-quantity="8"
        :selection-text="model.rowText"
      >
        <template #item="{ item }">
          <component :is="model.viewOf(item)" v-bind="model.propsOf(item)" />
        </template>
      </component>
    </div>
  </section>
</template>

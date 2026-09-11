<script setup lang="ts">
import { FilesPanel } from './FilesPanel';

const props = defineProps<FilesPanel.Props>();

const model = new (
  (props.kit?.namespace.Class as typeof FilesPanel.Class | undefined) ?? FilesPanel.Class
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
      <span class="ac-muted ac-pane-note">{{ model.coverageLabel }}</span>
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
        :is="model.kit.Scroller.vue"
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
          <div
            v-if="model.isFile(item)"
            class="ac-file"
            :class="model.fileClass(item)"
            :title="item.file.path"
            @click="model.toggle(item.file)"
          >
            <svg
              class="ac-file-toggle ac-chevron"
              :class="{ 'ac-turned': model.isExpanded(item.file) }"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path :d="model.chevronIcon" />
            </svg>
            <span class="ac-file-name">{{ item.file.name }}</span>
            <span class="ac-file-dir">{{ item.file.dir }}</span>
            <span class="ac-file-touches">{{ model.touchesLabel(item.file) }}</span>
            <button
              type="button"
              class="ac-file-go ac-go"
              title="Open the index on this file"
              @click.stop="model.open(item.file)"
            >
              <svg class="ac-go-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path :d="model.openIcon" />
              </svg>
            </button>
          </div>
          <div
            v-else
            class="ac-file-record"
            :class="model.recordClass(item.record)"
            @click="model.toggleRecord(item.record)"
          >
            <div class="ac-file-record-head">
              <svg
                class="ac-file-record-glyph ac-chevron"
                :class="{ 'ac-turned': model.isRecordOpen(item.record) }"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path :d="model.chevronIcon" />
              </svg>
              <span class="ac-file-record-tool">{{ model.recordLabel(item.record) }}</span>
              <span class="ac-file-record-summary">{{ model.diffSummary(item.record) }}</span>
              <button
                type="button"
                class="ac-file-record-index"
                title="Show this message in the chat"
                @click.stop="model.jump(item.record)"
              >
                {{ model.recordIndexLabel(item.record) }}
              </button>
              <span class="ac-file-record-time">{{ model.recordTimeLabel(item.record) }}</span>
              <button
                type="button"
                class="ac-file-record-go ac-go"
                title="Show this message in the chat"
                @click.stop="model.jump(item.record)"
              >
                <svg class="ac-go-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path :d="model.jumpIcon" />
                </svg>
              </button>
            </div>
            <pre
              v-if="model.isRecordOpen(item.record)"
              class="ac-file-diff"
            ><span class="ac-file-diff-lines"><span v-for="(line, at) in model.diffOf(item.record)" :key="at" class="ac-dl" :class="model.lineClass(line)">{{ line.sign }}{{ line.text }}</span></span></pre>
          </div>
        </template>
      </component>
    </div>
  </section>
</template>

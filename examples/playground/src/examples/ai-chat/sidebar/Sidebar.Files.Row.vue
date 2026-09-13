<script setup lang="ts">
import type { SidebarFiles } from './Sidebar.Files';

// One row of the files list: a file, or one of its open records. A leaf of
// its own so a window change re-renders only the rows that changed — inline
// in the scroller's slot, every mounted row was re-diffed on every walk.
// Markup only, over the panel model.
defineProps<SidebarFiles.RowProps>();
</script>

<template>
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

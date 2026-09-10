<script setup lang="ts">
import { FilesPanel } from './FilesPanel';

const props = defineProps<FilesPanel.Props>();

const model = new ((props.kit?.namespace.Class as typeof FilesPanel.Class | undefined) ?? FilesPanel.Class)(props);
const {
  // computed refs
  rows,
  // element refs
  scroller,
} = model;
</script>

<template>
  <section class="ac-panel-pane ac-files">
    <header class="ac-pane-head">
      <strong>Files</strong>
      <span class="ac-muted">{{ model.countLabel }}</span>
      <span class="ac-muted ac-pane-note">{{ model.coverageLabel }}</span>
    </header>
    <p v-if="!model.hasFiles" class="ac-pane-empty">No file has been read, edited or written in the messages loaded so far. Scroll the thread and the list fills.</p>
    <div v-else class="ac-file-list">
      <component :is="model.kit.Scroller.vue" ref="scroller" :kit="model.kit.Scroller" scrollbar :auto-repeat="false" :model-value="rows" :assumed-size="48" :padding-quantity="8" :selection-text="model.rowText">
        <template #item="{ item }">
          <div v-if="model.isFile(item)" class="ac-file" :class="model.fileClass(item)" :title="item.file.path" @click="model.toggle(item.file)">
            <span class="ac-file-toggle" aria-hidden="true">{{ model.toggleGlyph(item.file) }}</span>
            <span class="ac-file-name">{{ item.file.name }}</span>
            <span class="ac-file-dir">{{ item.file.dir }}</span>
            <span class="ac-file-touches">{{ model.touchesLabel(item.file) }}</span>
            <button type="button" class="ac-file-go" title="Open the index on this file" @click.stop="model.open(item.file)">→</button>
          </div>
          <div v-else class="ac-file-record" :class="model.recordClass(item.record)" @click="model.jump(item.record)">
            <div class="ac-file-record-head">
              <span class="ac-file-record-tool">{{ model.recordLabel(item.record) }}</span>
              <span class="ac-file-record-index">{{ model.recordIndexLabel(item.record) }}</span>
              <span class="ac-file-record-time">{{ model.recordTimeLabel(item.record) }}</span>
              <span class="ac-file-record-go" aria-hidden="true">→</span>
            </div>
            <pre class="ac-file-diff"><span v-for="(line, at) in model.diffOf(item.record)" :key="at" class="ac-dl" :class="model.lineClass(line)">{{ line.sign }}{{ line.text }}</span></pre>
          </div>
        </template>
      </component>
    </div>
  </section>
</template>

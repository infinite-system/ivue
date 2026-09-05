<script setup lang="ts">
import DemoBox from './DemoBox.vue';
import { GroceryList } from '@examples/composable/GroceryList';

// GroceryList hosts an UndoHistory — the same class useUndoHistory()
// hands a composable consumer — and records one labeled step per
// operation. Undo, redo and the rail only move the history's cursor.
const list = new GroceryList.Class();
</script>

<template>
  <DemoBox
    title="A class, published as a composable"
    note="The undo history is an ivue class behind a one-line useUndoHistory() face. Every operation records a labeled snapshot; undo, redo and the step rail move its cursor. A branch you undo past is struck through and dropped by the next operation, the way every editor's history behaves."
  >
    <div class="d-row">
      <button class="d-btn primary" type="button" @click="list.add()">{{ list.addLabel }}</button>
      <button class="d-btn" type="button" :disabled="!list.canRemove" @click="list.removeLast()">remove last</button>
      <button class="d-btn" type="button" :disabled="list.isEmpty" @click="list.double()">double</button>
      <button class="d-btn" type="button" :disabled="list.isEmpty" @click="list.sort()">sort</button>
      <button class="d-btn" type="button" :disabled="list.isEmpty" @click="list.reverse()">reverse</button>
    </div>
    <div class="d-row">
      <button class="d-btn" type="button" :disabled="!list.history.canUndo" @click="list.history.undo()">
        {{ list.history.undoLabel }}
      </button>
      <button class="d-btn" type="button" :disabled="!list.history.canRedo" @click="list.history.redo()">
        {{ list.history.redoLabel }}
      </button>
      <span class="d-mono">{{ list.history.positionLabel }}</span>
    </div>
    <div class="u-list">
      <span v-if="list.isEmpty" class="d-mono">empty — add something</span>
      <span v-for="(item, index) in list.items" :key="index" class="u-chip">{{ item }}</span>
    </div>
    <ol class="u-rail">
      <li
        v-for="(entry, index) in list.steps"
        :key="index"
        class="u-step"
        :class="{ current: list.history.isCurrent(index), ahead: list.history.isAhead(index) }"
        @click="list.history.jumpTo(index)"
      >
        {{ entry.label }}
      </li>
    </ol>
  </DemoBox>
</template>

<style scoped>
.u-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 34px;
  margin: 12px 0 0;
}
.u-chip {
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--vp-c-divider);
  font-size: 13px;
}
.u-rail {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}
.u-step {
  /* VitePress styles every `li` in a doc page (margin, line-height) —
     the rail's steps are pills, so pin both */
  margin: 0;
  padding: 2px 9px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  font-size: 12px;
  line-height: 1.4;
  color: var(--vp-c-text-2);
  cursor: pointer;
}
.u-step.current {
  border-color: var(--ivue-link-2);
  color: var(--vp-c-text-1);
  font-weight: 600;
}
.u-step.ahead {
  opacity: 0.45;
  text-decoration: line-through;
}
</style>

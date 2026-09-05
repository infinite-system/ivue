<script setup lang="ts">
import { ComposableExample } from './ComposableExample';

// ONE model owns the route; it hosts the Pointer (a class hosting a
// composable) and the GroceryList (a class published as one).
const example = new ComposableExample.Class();
</script>

<template>
  <div class="pane">
    <p class="note">
      Two directions of the same seam. <strong>Hosting:</strong> useMouse
      lives inside the Pointer class — private, created once on the first
      read; the readouts are plain getters over it.
      <strong>Publishing:</strong> the undo history is an ivue class behind a
      one-line useUndoHistory() face; every list operation records a step,
      and undo / redo / the rail only move its cursor.
    </p>

    <div class="vals">
      <div>
        <div class="k">x · page</div>
        <div class="n">{{ example.pointer.pageX }}</div>
      </div>
      <div>
        <div class="k">y · page</div>
        <div class="n">{{ example.pointer.pageY }}</div>
      </div>
      <div>
        <div class="k">history</div>
        <div class="n mono">{{ example.history.positionLabel }}</div>
      </div>
    </div>

    <div class="row">
      <button class="btn primary" type="button" @click="example.list.add()">
        {{ example.list.addLabel }}
      </button>
      <button class="btn" type="button" :disabled="example.list.isEmpty" @click="example.list.double()">
        double
      </button>
      <button class="btn" type="button" :disabled="example.list.isEmpty" @click="example.list.sort()">
        sort
      </button>
      <button class="btn" type="button" :disabled="example.list.isEmpty" @click="example.list.reverse()">
        reverse
      </button>
    </div>
    <div class="row">
      <button
        class="btn"
        type="button"
        :disabled="!example.history.canUndo"
        @click="example.history.undo()"
      >
        undo
      </button>
      <button
        class="btn"
        type="button"
        :disabled="!example.history.canRedo"
        @click="example.history.redo()"
      >
        redo
      </button>
    </div>

    <ol class="rail">
      <li
        v-for="(entry, index) in example.list.steps"
        :key="index"
        class="step"
        :class="{ current: example.history.isCurrent(index), ahead: example.history.isAhead(index) }"
        @click="example.history.jumpTo(index)"
      >
        {{ entry.label }}
      </li>
    </ol>
    <div class="k result">Result:</div>
    <div class="list">
      <span v-if="example.list.isEmpty" class="mono">empty — add something</span>
      <span v-for="(item, index) in example.list.items" :key="index" class="chip">{{ item }}</span>
    </div>

  </div>
</template>

<style scoped src="../example-pane.css"></style>
<style scoped>
.result {
  margin-top: 14px;
}
.list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 34px;
  margin-top: 6px;
}
.chip {
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  font-size: 13px;
}
.rail {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}
.step {
  padding: 3px 9px;
  border-radius: 6px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  font-size: 12px;
  cursor: pointer;
  opacity: 0.75;
}
.step.current {
  border-color: #6366f1;
  opacity: 1;
  font-weight: 600;
}
.step.ahead {
  opacity: 0.4;
  text-decoration: line-through;
}
</style>

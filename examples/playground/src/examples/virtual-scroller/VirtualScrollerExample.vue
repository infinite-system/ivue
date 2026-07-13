<script setup lang="ts">
import VirtualScroller from './VirtualScroller.vue';
import { VirtualScrollerExample, ITEM_COUNT } from './VirtualScrollerExample';

const example = new VirtualScrollerExample.Class();

// the state destructure — every Ref the template touches, grouped
const {
  // state refs
  items,
  // element refs
  scroller,
} = example;
</script>

<template>
  <div class="example">
    <header class="example-header">
      <p>
        {{ ITEM_COUNT.toLocaleString() }} rows ·
        {{ example.renderedCount }} in the DOM
      </p>
      <nav>
        <button type="button" @click="example.jumpTo(499999)">
          jump to #500,000
        </button>
        <button type="button" @click="example.jumpTo(ITEM_COUNT - 1)">
          the end
        </button>
        <button type="button" @click="example.jumpTo(0)">the top</button>
      </nav>
    </header>
    <main class="example-body">
      <VirtualScroller
        ref="scroller"
        v-model="items"
        :assumed-height="56"
        :padding-quantity="10"
      >
        <template #item="{ item }">
          <div class="row">
            <b>#{{ Number(item.position).toLocaleString() }}</b> —
            {{ item.body }}
          </div>
        </template>
      </VirtualScroller>
    </main>
  </div>
</template>

<style scoped>
.example {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.example-header {
  padding: 14px 20px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}
.example-header p {
  margin: 0 0 10px;
  font-size: 13px;
  color: #8b95b5;
}
nav {
  display: flex;
  gap: 8px;
}
nav button {
  padding: 6px 12px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #dbe1f4;
  font-size: 12.5px;
  cursor: pointer;
}
nav button:hover {
  border-color: #6366f1;
}
.example-body {
  flex: 1;
  min-height: 0;
}
.row {
  padding: 12px 20px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  font-size: 13.5px;
  line-height: 1.6;
}
.row b {
  color: #7dd3fc;
}
</style>

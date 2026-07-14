<script setup lang="ts">
import { KernelExample } from './KernelExample';

const example = new KernelExample.Class();

// the state destructure
const {
  // state refs
  tabs,
  graph,
} = example;
</script>

<template>
  <div class="pane pane-wide">
    <p class="note">
      Construction binds to a NAME. Toggle a plugin: the kernel resets,
      re-registers the active plugins, seals the class graph, and rebuilds
      every tab — the production flow (register → seal → mount), re-run on
      change. Plugins stack, and PinnedTab (which extends Tab) inherits Tab's
      plugins because seal re-parents its chain. `new Tab.Class()` never does
      a lookup — it reads the live binding the kernel rewrote.
    </p>

    <div class="kx-plugins">
      <button
        v-for="plugin in example.plugins"
        :key="plugin.id"
        type="button"
        class="btn"
        :class="{ primary: example.isActive(plugin.id) }"
        @click="example.togglePlugin(plugin.id)"
      >
        {{ example.isActive(plugin.id) ? '● ' : '○ ' }}{{ plugin.label }} plugin
      </button>
    </div>

    <div class="row" style="margin-bottom: 16px">
      <button class="btn primary" type="button" @click="example.addTab('tab')">
        + Tab
      </button>
      <button class="btn" type="button" @click="example.addTab('pinned')">
        + Pinned tab
      </button>
      <span class="mono">active: {{ example.activeSummary }}</span>
    </div>

    <div class="kx-tabs">
      <div
        v-for="tab in tabs"
        :key="tab.title"
        class="kx-tab"
        :style="{ borderLeftColor: tab.accent }"
      >
        <div class="kx-tab__head">
          <span class="kx-tab__title">{{ tab.title }}</span>
          <button
            class="kx-tab__close"
            type="button"
            @click="example.closeTab(tab)"
          >
            ×
          </button>
        </div>
        <div v-if="tab.badges.length" class="kx-tab__badges">
          <span
            v-for="badge in tab.badges"
            :key="badge"
            class="kx-badge"
            :style="{ color: tab.accent }"
          >
            {{ badge }}
          </span>
        </div>
        <div v-else class="kx-tab__plain mono">base — no plugins</div>
      </div>
    </div>

    <div class="kx-graph">
      <div class="kx-graph__label mono">kernel.getClassGraph()</div>
      <div v-for="node in graph" :key="node.name" class="kx-graph__row mono">
        <strong>{{ node.name }}</strong>
        <span v-if="node.extends" class="kx-graph__dim">
          extends {{ node.extends }}</span
        >
        <span v-if="node.plugins.length" class="kx-graph__plugins">
          ◂ {{ node.plugins.join(' ◂ ') }}</span
        >
      </div>
    </div>
  </div>
</template>

<style scoped src="../example-pane.css"></style>

<style scoped>
.pane-wide {
  max-width: 760px;
}
.kx-plugins {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.kx-tabs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(220px, 100%), 1fr));
  gap: 12px;
  margin-bottom: 20px;
}
.kx-tab {
  padding: 12px 14px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-left: 3px solid #6366f1;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
}
.kx-tab__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.kx-tab__title {
  font-weight: 600;
  font-size: 13.5px;
  color: #dbe1f4;
}
.kx-tab__close {
  border: none;
  background: none;
  color: #8b95b5;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}
.kx-tab__close:hover {
  color: #f87171;
}
.kx-tab__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.kx-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.06);
}
.kx-tab__plain {
  margin-top: 8px;
  font-size: 11px;
}
.kx-graph {
  padding: 14px 16px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
}
.kx-graph__label {
  font-size: 11px;
  color: #64748b;
  margin-bottom: 8px;
}
.kx-graph__row {
  font-size: 12.5px;
  color: #dbe1f4;
  padding: 2px 0;
}
.kx-graph__dim {
  color: #8b95b5;
}
.kx-graph__plugins {
  color: #34d399;
}
</style>

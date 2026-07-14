<script setup lang="ts">
import { KernelExample } from './KernelExample';

const example = new KernelExample.Class();
</script>

<template>
  <div class="pane pane-wide">
    <p class="note">
      Construction binds to a NAME, not a class. Toggle a plugin: it extends
      whatever class is registered under 'Tab' and re-registers it, so every
      tab you add afterwards is the extended class — super chains, reactive
      state and all. Plugins stack. No DI container, no decorators; the whole
      system is a 15-line kernel.
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
        {{ example.isActive(plugin.id) ? '● ' : '○ ' }}{{ plugin.label }}
      </button>
    </div>

    <p class="mono kx-summary">
      new tabs will be: <strong>{{ example.activeSummary }}</strong>
    </p>

    <div class="row" style="margin-bottom: 16px">
      <button class="btn primary" type="button" @click="example.addTab()">
        + Add tab
      </button>
      <button
        class="btn"
        type="button"
        :disabled="!example.hasTabs"
        @click="example.remakeAll()"
      >
        Re-make all through kernel
      </button>
    </div>

    <div class="kx-tabs">
      <div
        v-for="tab in example.tabs.value"
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
        <div v-else class="kx-tab__plain mono">base tab — no plugins</div>
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
.kx-summary {
  margin: 0 0 16px;
}
.kx-summary strong {
  color: #dbe1f4;
}
.kx-tabs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(220px, 100%), 1fr));
  gap: 12px;
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
</style>

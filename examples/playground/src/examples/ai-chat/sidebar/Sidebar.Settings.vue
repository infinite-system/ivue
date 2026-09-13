<script setup lang="ts">
import { SidebarSettings } from './Sidebar.Settings';

const props = defineProps<SidebarSettings.Props>();

const model = new (
  (props.kit?.namespace?.Class as typeof SidebarSettings.Class | undefined) ?? SidebarSettings.Class
)(props);
const {
  // state refs
  query,
  // computed refs
  rows,
  // element refs
  searchElement
} = model;
</script>

<template>
  <section class="ac-panel-pane ac-settings">
    <header class="ac-pane-head">
      <strong>Settings</strong>
      <span class="ac-muted ac-pane-sub">a configuration layer over the shipped chat</span>
      <button type="button" class="ac-close" title="Close" @click="model.close()">
        <svg class="ac-close-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path :d="model.closeIcon" />
        </svg>
      </button>
    </header>

    <div class="ac-index-search ac-settings-search">
      <svg class="ac-search-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path :d="model.searchIcon" />
      </svg>
      <input
        ref="searchElement"
        v-model="query"
        type="search"
        class="ac-search"
        placeholder="Search settings…"
        aria-label="Search settings"
      />
      <button v-if="query" type="button" class="ac-link" @click="model.clearQuery()">clear</button>
    </div>
    <p v-if="model.hasNoMatch" class="ac-pane-empty">No setting matches.</p>
    <div v-else class="ac-settings-list">
      <component
        :is="model.kit.Scroller.view"
        :kit="model.kit.Scroller"
        scrollbar
        :auto-repeat="false"
        :model-value="rows"
        :assumed-size="220"
        :padding-quantity="3"
        :selection-text="model.rowText"
      >
        <template #item="{ item }">
          <div class="ac-setting">
            <h5>{{ item.label }}</h5>
            <div v-if="model.isSection(item, 'theme')" class="ac-choice-list">
              <button
                v-for="option in model.themes"
                :key="option.value"
                type="button"
                class="ac-choice"
                :class="{ 'ac-on': model.isTheme(option.value) }"
                @click="model.setTheme(option.value)"
              >
                <span class="ac-choice-swatch" :data-theme="option.value" aria-hidden="true"></span>
                <span class="ac-choice-label">{{ option.label }}</span>
                <span class="ac-choice-hint">{{ option.hint }}</span>
              </button>
            </div>
            <div v-else-if="model.isSection(item, 'density')" class="ac-choice-list">
              <button
                v-for="option in model.densities"
                :key="option.value"
                type="button"
                class="ac-choice"
                :class="{ 'ac-on': model.isDensity(option.value) }"
                @click="model.setDensity(option.value)"
              >
                <span class="ac-choice-label">{{ option.label }}</span>
                <span class="ac-choice-hint">{{ option.hint }}</span>
              </button>
            </div>
            <template v-else>
              <div class="ac-choice-list">
                <button
                  v-for="tree in model.trees"
                  :key="tree.id"
                  type="button"
                  class="ac-choice"
                  :class="{ 'ac-on': model.isTree(tree) }"
                  @click="model.setTree(tree)"
                >
                  <span class="ac-choice-label">{{ tree.label }}</span>
                  <span class="ac-choice-hint">{{ tree.hint }}</span>
                </button>
              </div>
              <pre class="ac-patch"><code>{{ model.patch }}</code></pre>
            </template>
          </div>
        </template>
      </component>
    </div>
  </section>
</template>

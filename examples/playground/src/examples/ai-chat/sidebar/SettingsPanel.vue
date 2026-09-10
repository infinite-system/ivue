<script setup lang="ts">
import { SettingsPanel } from './SettingsPanel';

const props = defineProps<SettingsPanel.Props>();

const model = new ((props.kit?.namespace.Class as typeof SettingsPanel.Class | undefined) ?? SettingsPanel.Class)(props);
// the sections are a static table: read once for the scroller's list
const sections = model.sections;
</script>

<template>
  <section class="ac-panel-pane ac-settings">
    <header class="ac-pane-head">
      <strong>Settings</strong>
      <span class="ac-muted">a configuration layer over the shipped chat</span>
    </header>

    <div class="ac-settings-list">
      <component :is="model.kit.Scroller.vue" :kit="model.kit.Scroller" scrollbar :auto-repeat="false" :model-value="sections" :assumed-size="220" :padding-quantity="3" :selection-text="model.rowText">
        <template #item="{ item }">
          <div class="ac-setting">
            <h5>{{ item.label }}</h5>
            <div v-if="model.isSection(item, 'theme')" class="ac-choice-list">
              <button v-for="option in model.themes" :key="option.value" type="button" class="ac-choice" :class="{ 'ac-on': model.isTheme(option.value) }" @click="model.setTheme(option.value)">
                <span class="ac-choice-swatch" :data-theme="option.value" aria-hidden="true"></span>
                <span class="ac-choice-label">{{ option.label }}</span>
                <span class="ac-choice-hint">{{ option.hint }}</span>
              </button>
            </div>
            <div v-else-if="model.isSection(item, 'density')" class="ac-choice-list">
              <button v-for="option in model.densities" :key="option.value" type="button" class="ac-choice" :class="{ 'ac-on': model.isDensity(option.value) }" @click="model.setDensity(option.value)">
                <span class="ac-choice-label">{{ option.label }}</span>
                <span class="ac-choice-hint">{{ option.hint }}</span>
              </button>
            </div>
            <template v-else>
              <div class="ac-choice-list">
                <button v-for="tree in model.trees" :key="tree.id" type="button" class="ac-choice" :class="{ 'ac-on': model.isTree(tree) }" @click="model.setTree(tree)">
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

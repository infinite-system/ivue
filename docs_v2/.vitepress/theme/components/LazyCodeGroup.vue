<script setup lang="ts">
import { LazyCodeGroup } from './LazyCodeGroup';

const props = defineProps<LazyCodeGroup.Props>();

const group = new LazyCodeGroup.Class(props);
</script>

<template>
  <div class="vp-code-group vp-adaptive-theme lazy-code-group">
    <div class="tabs">
      <template v-for="(file, index) in group.files" :key="file.path">
        <input
          :id="group.inputId(index)"
          type="radio"
          :name="group.name"
          :checked="group.isActive(index)"
          @change="group.select(index)"
        />
        <label :for="group.inputId(index)">{{ file.label }}</label>
      </template>
    </div>
    <div class="blocks">
      <p v-if="group.showsStatus" class="lazy-code-group__status">
        {{ group.statusText }}
      </p>
      <div v-else v-html="group.activeHtml"></div>
    </div>
  </div>
</template>

<style>
.lazy-code-group__status {
  margin: 0;
  padding: 20px 24px;
  border-radius: 0 0 8px 8px;
  background-color: var(--vp-code-block-bg);
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
  font-size: var(--vp-code-font-size);
}
</style>

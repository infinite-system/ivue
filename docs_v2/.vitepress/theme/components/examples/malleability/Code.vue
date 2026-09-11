<script setup lang="ts">
import { Code } from './Code';

const props = defineProps(Code.Class.props);
const emit = defineEmits(Code.Class.emits) as Code.Emits;

// the one `new`: the class the entry names, or this view's own
const model = new (props.kit?.namespace.Class ?? Code.Class)(props, emit);

defineExpose(model as Code.Instance);
</script>

<template>
  <div
    class="code-block"
    :class="model.blockClass"
    :style="model.blockStyle"
    :data-engine="model.engineLabel"
    :data-theme="model.theme"
  >
    <ol v-if="model.lineNumbers" class="code-gutter" aria-hidden="true">
      <li v-for="line in model.visibleLineCount" :key="line">{{ line }}</li>
    </ol>
    <div class="code-html" v-html="model.renderedHtml"></div>
    <button v-if="model.isFoldable" type="button" class="code-fold" @click="model.toggleFold()">
      {{ model.foldLabel }}
    </button>
  </div>
</template>

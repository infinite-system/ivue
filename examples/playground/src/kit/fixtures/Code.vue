<script setup lang="ts">
import { Code } from './Code';

const props = defineProps(Code.Class.props);
const emit = defineEmits(Code.Class.emits) as Code.Emits;

// the one `new`: the class the entry names, or this view's own
const model = new (props.kit?.namespace.Class ?? Code.Class)(props, emit);

defineExpose(model as Code.Instance);
</script>

<template>
  <pre class="code" :data-lang="model.lang" :data-theme="model.theme" @click="model.copy()">{{ model.visible }}</pre>
</template>

<style scoped>
.code {
  margin: 0;
}
</style>

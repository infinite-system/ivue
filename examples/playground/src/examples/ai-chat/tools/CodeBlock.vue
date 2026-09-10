<script setup lang="ts">
import { CodeBlock } from './CodeBlock';

const props = defineProps<CodeBlock.Props>();

const model = new ((props.kit?.namespace.Class as typeof CodeBlock.Class | undefined) ?? CodeBlock.Class)(props);
</script>

<template>
  <div class="ac-code" :class="model.blockClass" :style="model.blockStyle" v-html="model.renderedHtml"></div>
</template>

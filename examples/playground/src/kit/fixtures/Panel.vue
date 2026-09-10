<script setup lang="ts">
import { Panel } from './Panel';

const props = defineProps(Panel.Class.props);

const model = new (props.kit?.namespace.Class ?? Panel.Class)(props);

defineExpose(model as Panel.Instance);
</script>

<template>
  <div class="panel">
    <component
      :is="model.kit.Card.vue"
      v-for="title in model.titles"
      :key="title"
      :kit="model.kit.Card"
      :title="title"
      :items="model.itemsFor(title)"
    />
  </div>
</template>

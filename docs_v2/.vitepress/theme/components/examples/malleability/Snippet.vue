<script setup lang="ts">
import { Snippet } from './Snippet';

const props = defineProps(Snippet.Class.props);

const model = new (props.kit?.namespace.Class ?? Snippet.Class)(props);

defineExpose(model as Snippet.Instance);
</script>

<template>
  <article class="snip" :style="model.cardStyle">
    <component :is="model.kit.Head.view" :kit="model.kit.Head" :model="model" />
    <component
      :is="model.kit.Code.view"
      :kit="model.kit.Code"
      :code="model.code"
      :lang="model.lang"
      @copy="model.onCopy($event)"
    />
    <component :is="model.kit.Foot.view" :kit="model.kit.Foot" :model="model" />
  </article>
</template>

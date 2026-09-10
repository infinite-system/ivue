<script setup lang="ts">
import { Card } from './Card';

const props = defineProps(Card.Class.props);

const model = new (props.kit?.namespace.Class ?? Card.Class)(props);

defineExpose(model as Card.Instance);
</script>

<template>
  <article class="card">
    <component :is="model.kit.Head.vue" :kit="model.kit.Head" :model="model" />
    <component :is="model.kit.Body.vue" :kit="model.kit.Body" :model="model" />
    <component :is="model.kit.Frame.vue" :kit="model.kit.Frame" :model="model">
      <em class="slotted">{{ model.title }}</em>
    </component>
  </article>
</template>

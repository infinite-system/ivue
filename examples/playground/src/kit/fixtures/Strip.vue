<script setup lang="ts">
import { Strip } from './Strip';

const props = defineProps(Strip.Class.props);

const model = new (props.kit?.namespace.Class ?? Strip.Class)(props);

defineExpose(model as Strip.Instance);
</script>

<template>
  <section class="strip">
    <!-- the sections are the kit's order: each seam renders the role's view over what the entry binds -->
    <template v-for="role in model.kit.order" :key="role">
      <component
        v-if="model.shows(role)"
        :is="model.kit[role].view"
        v-bind="model.seam(role)"
      />
    </template>
  </section>
</template>

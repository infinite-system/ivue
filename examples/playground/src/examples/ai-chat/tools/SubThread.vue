<script setup lang="ts">
import { SubThread } from './SubThread';

const props = defineProps<SubThread.Props>();

const model = new (
  (props.kit?.namespace.Class as typeof SubThread.Class | undefined) ?? SubThread.Class
)(props);
</script>

<template>
  <div class="ac-subthread">
    <p class="ac-subthread-head">{{ model.countLabel }}</p>
    <component
      :is="model.kit.Message.vue"
      v-for="row in model.rows"
      :key="row.id"
      :kit="model.kit.Message"
      :row="row"
      :chat="chat"
    />
  </div>
</template>

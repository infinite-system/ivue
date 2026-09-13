<script setup lang="ts">
import { MessagePartList } from './MessagePartList';

const props = defineProps<MessagePartList.Props>();

// the one `new`: the class the entry names, or this view's own
const model = new (
  (props.kit?.namespace?.Class as typeof MessagePartList.Class | undefined) ?? MessagePartList.Class
)(props);
</script>

<template>
  <div class="ac-parts">
    <component
      v-for="(part, at) in model.parts"
      :key="model.keyOf(part, at)"
      :is="model.viewOf(part)"
      v-bind="model.propsOf(part, at)"
    />
  </div>
</template>

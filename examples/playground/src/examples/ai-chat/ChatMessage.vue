<script setup lang="ts">
import { ChatMessage } from './ChatMessage';

const props = defineProps<ChatMessage.Props>();

// the one `new`: the class the entry names, or this view's own
const model = new (
  (props.kit?.namespace.Class as typeof ChatMessage.Class | undefined) ?? ChatMessage.Class
)(props);
</script>

<template>
  <article class="ac-msg" :class="model.rowClass">
    <!-- the row's sections are the kit's order: each seam renders the role's view over what the entry binds -->
    <template v-for="role in model.kit.order" :key="role">
      <component
        v-if="model.shows(role)"
        :is="model.kit[role].view"
        v-bind="model.seamProps(role)"
      />
    </template>
  </article>
</template>

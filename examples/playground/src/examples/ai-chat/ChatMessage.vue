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
    <component :is="model.kit.Gutter.view" :kit="model.kit.Gutter" :model="model" />
    <div class="ac-msg-body">
      <component :is="model.kit.Head.view" :kit="model.kit.Head" :model="model" />
      <component
        v-if="model.isStub"
        :is="model.kit.Stub.view"
        :kit="model.kit.Stub"
        :model="model"
      />
      <component v-else :is="model.kit.Parts.view" :kit="model.kit.Parts" :model="model" />
      <component
        v-if="model.receiptLabel"
        :is="model.kit.Foot.view"
        :kit="model.kit.Foot"
        :model="model"
      />
    </div>
  </article>
</template>

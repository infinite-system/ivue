<script setup lang="ts">
import type { Kit } from '../../../kit/Kit';
import type { ChatMessage } from '../ChatMessage';

// The collection section: every part of the message through its own seam,
// the entry the row's kit names for the part's kind, then the await line
// while a reply waits for its first token. Markup only.
defineProps<{ kit: Kit.Entry; model: ChatMessage.Instance }>();
</script>

<template>
  <div class="ac-parts">
    <component
      :is="model.partView(part)"
      v-for="(part, at) in model.parts"
      :key="model.partKey(part, at)"
      :kit="model.partEntry(part)"
      :part="part"
      :chat="model.chat"
      :message="model.message"
    />
    <component
      v-if="model.isAwaitingFirstToken"
      :is="model.kit.Await.view"
      :kit="model.kit.Await"
      :model="model"
    />
  </div>
</template>

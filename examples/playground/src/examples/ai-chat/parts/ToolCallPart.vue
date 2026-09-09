<script setup lang="ts">
import type { SessionLog } from '../SessionLog';
import type { Parts } from './Parts';
import { Tools } from '../tools/Tools';

// One tool call: the registry names the card for its tool. Markup only —
// the card's own class owns every word.
defineProps<Parts.Props<SessionLog.ToolCallPart>>();
</script>

<template>
  <component :is="Tools.Class.componentFor(part.call.name)" :call="part.call" :chat="chat" :message="message" />
</template>

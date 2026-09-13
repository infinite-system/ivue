<script setup lang="ts">
import type { SessionLog } from '../../SessionLog';
import type { MessagePart } from './MessagePart';
import { MessagePartSystem } from './MessagePart.System';

const props = defineProps<MessagePart.Props<SessionLog.SystemPart>>();

const model = new (
  (props.kit?.namespace?.Class as typeof MessagePartSystem.Class | undefined) ??
  MessagePartSystem.Class
)(props);
</script>

<template>
  <div class="ac-system" :class="model.subtypeClass">
    <template v-for="role in model.kit.order" :key="role">
      <component :is="model.kit[role].view" v-bind="model.seam(role)" />
    </template>
  </div>
</template>

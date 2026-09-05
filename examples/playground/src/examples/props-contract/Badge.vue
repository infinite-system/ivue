<script lang="ts" setup>
import { Badge } from './Badge';

// the runtime contract, straight off the class — types, defaults, validator
const props = defineProps(Badge.Class.props);

const badge = new Badge.Class(props as Badge.Props);
</script>

<template>
  <span :class="badge.classes" :style="badge.style">{{ badge.label }}</span>
</template>

<style>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  padding: 0.3em 0.7em;
  border-radius: 6px;
  font-weight: 600;
  line-height: 1;
  border: 1px solid transparent;
}
.badge--rounded {
  border-radius: 999px;
}
.badge--neutral {
  background: rgba(148, 163, 184, 0.16);
  border-color: rgba(148, 163, 184, 0.3);
  color: #cbd5e1;
}
.badge--success {
  background: rgba(52, 211, 153, 0.16);
  border-color: rgba(52, 211, 153, 0.4);
  color: #6ee7b7;
}
.badge--danger {
  background: rgba(248, 113, 113, 0.16);
  border-color: rgba(248, 113, 113, 0.4);
  color: #fca5a5;
}
</style>

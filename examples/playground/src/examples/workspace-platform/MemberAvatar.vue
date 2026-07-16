<script setup lang="ts">
import type { Member } from './Member';

withDefaults(
  defineProps<{
    member?: Member.Model;
    size?: 'small' | 'medium' | 'large';
  }>(),
  { size: 'medium' },
);
</script>

<template>
  <span
    class="ow-avatar"
    :class="`ow-avatar--${size}`"
    :style="{ background: member?.color ?? '#94a3b8' }"
    :title="member?.name ?? 'Unassigned'"
  >
    <span class="ow-avatar__initials">{{ member?.initials ?? '?' }}</span>
    <i v-if="member?.online.value" aria-label="Online"></i>
  </span>
</template>

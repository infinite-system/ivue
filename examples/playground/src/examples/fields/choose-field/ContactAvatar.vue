<script lang="ts" setup>
// ContactAvatar — deterministic initials avatar. Pure presentational: two
// tiny derivations off props, no state — a plain SFC, no class needed.
import { computed } from 'vue';

const props = withDefaults(defineProps<{ name: string; size?: number }>(), {
  size: 32,
});

const initials = computed(() =>
  props.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join(''),
);

/** Deterministic hue from the name — the same contact always gets the same color. */
const backgroundColor = computed(() => {
  let hash = 0;
  for (const character of props.name) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
});
</script>

<template>
  <span
    class="contact-avatar"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      fontSize: `${Math.round(size * 0.42)}px`,
      backgroundColor,
    }"
    >{{ initials }}</span
  >
</template>

<style>
.contact-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
  font-weight: 600;
  letter-spacing: 0.02em;
  user-select: none;
  flex: none;
}
</style>

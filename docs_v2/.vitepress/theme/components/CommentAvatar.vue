<script setup lang="ts">
// A commenter's identicon, drawn from the Worker's avatar seed — a
// non-reversible handle for their address, so the same person keeps the
// same face across posts while the address never leaves the Worker.
// Deterministic and dependency-free: a mirrored 5×5 bit field over a
// two-stop gradient, hue picked from the seed.
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{ seed: string; name: string; size?: number }>(),
  { size: 34 },
);

// FNV-1a over the seed (the seed is already a digest; this only spreads
// it into the few small numbers the drawing needs)
const hashed = computed(() => {
  let hash = 0x811c9dc5;
  const source = props.seed || props.name || 'anonymous';
  for (let index = 0; index < source.length; index++) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
});

const hue = computed(() => hashed.value % 360);
const secondHue = computed(() => (hue.value + 42 + (hashed.value % 60)) % 360);

// 5 columns × 5 rows, mirrored across the vertical axis: 15 bits decide
// the pattern, so it reads as a face/glyph rather than noise
const cells = computed(() => {
  const bits: { x: number; y: number }[] = [];
  let state = hashed.value || 1;
  const next = () => {
    // xorshift32 — same seed, same picture, forever
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0xffffffff;
  };
  for (let column = 0; column < 3; column++) {
    for (let row = 0; row < 5; row++) {
      if (next() > 0.5) continue;
      bits.push({ x: column, y: row });
      if (column < 2) bits.push({ x: 4 - column, y: row });
    }
  }
  return bits;
});

const initial = computed(() =>
  (props.name || '?').trim().charAt(0).toUpperCase(),
);
</script>

<template>
  <svg
    class="comment-avatar"
    :width="props.size"
    :height="props.size"
    viewBox="0 0 20 20"
    role="img"
    :aria-label="`${props.name}'s avatar`"
  >
    <defs>
      <linearGradient :id="`ca-${props.seed || initial}`" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" :stop-color="`hsl(${hue} 68% 52%)`" />
        <stop offset="100%" :stop-color="`hsl(${secondHue} 70% 44%)`" />
      </linearGradient>
    </defs>
    <rect
      width="20"
      height="20"
      rx="6"
      :fill="`url(#ca-${props.seed || initial})`"
    />
    <g fill="#ffffff" fill-opacity="0.9">
      <rect
        v-for="(cell, index) in cells"
        :key="index"
        :x="3 + cell.x * 2.8"
        :y="3 + cell.y * 2.8"
        width="2.8"
        height="2.8"
      />
    </g>
  </svg>
</template>

<style scoped>
.comment-avatar {
  flex: none;
  border-radius: 6px;
  display: block;
}
</style>

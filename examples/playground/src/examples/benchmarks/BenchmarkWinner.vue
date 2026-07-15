<script setup lang="ts">
withDefaults(defineProps<{ placement?: 'before' | 'after' }>(), {
  placement: 'before',
});
</script>

<template>
  <span
    class="benchmark-winner"
    :class="`benchmark-winner--${placement}`"
    role="img"
    aria-label="Best measured result among fully reactive implementations"
    title="Best measured result among fully reactive implementations"
  >
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path
        class="benchmark-winner__flame"
        d="M5.1 11.1c-1.4.3-2.2 1.1-2.5 2.4 1.3-.2 2.2-1 2.6-2.3Z"
      />
      <path
        class="benchmark-winner__fin"
        d="m6.2 9.7-2.7.1 1.6-2.2m1.2 2.2-.1 2.7 2.2-1.6"
      />
      <path
        class="benchmark-winner__body"
        d="M5.1 10.9c.4-2 1.6-4.2 3.4-5.9 1.5-1.4 3.1-2.2 4.7-2.3-.1 1.7-.9 3.3-2.3 4.8-1.7 1.8-3.9 3-5.8 3.4Z"
      />
      <circle class="benchmark-winner__window" cx="9.9" cy="6.1" r="1.25" />
    </svg>
  </span>
</template>

<style scoped>
.benchmark-winner {
  display: inline-flex;
  width: 1.05em;
  height: 1.05em;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  margin-right: 0.22em;
  vertical-align: -0.13em;
}

.benchmark-winner--after {
  margin-right: 0;
  margin-left: 0.22em;
}

.benchmark-winner svg {
  width: 100%;
  height: 100%;
  overflow: visible;
  filter: drop-shadow(0 0 3px rgba(45, 212, 191, 0.32));
}

.benchmark-winner__body,
.benchmark-winner__fin {
  stroke-linecap: round;
  stroke-linejoin: round;
}

.benchmark-winner__body {
  fill: #2dd4bf;
  stroke: #0f766e;
  stroke-width: 0.8;
}

.benchmark-winner__fin {
  fill: #818cf8;
  stroke: #818cf8;
  stroke-width: 1.35;
}

.benchmark-winner__window {
  fill: #eef2ff;
  stroke: #6366f1;
  stroke-width: 0.75;
}

.benchmark-winner__flame {
  fill: #a78bfa;
}
</style>

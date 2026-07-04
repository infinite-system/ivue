<script setup lang="ts">
defineProps<{ title: string; note?: string }>();
</script>

<template>
  <div class="dbx">
    <div class="dbx-head">
      <span class="dot" aria-hidden="true" />
      <span class="t">{{ title }}</span>
      <span class="badge">Live &middot; runs the shipped engine</span>
    </div>
    <div class="dbx-body">
      <slot />
    </div>
    <div v-if="note" class="dbx-note">{{ note }}</div>
  </div>
</template>

<style scoped>
.dbx {
  margin: 24px 0;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: #0d1226;
  box-shadow: 0 22px 60px -28px rgba(99, 102, 241, 0.4);
  overflow: hidden;
}
.dbx-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(255, 255, 255, 0.02);
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 3px;
  background: linear-gradient(120deg, #6366f1, #34d399);
}
.t {
  font-weight: 640;
  font-size: 0.92rem;
  letter-spacing: -0.01em;
  color: #e2e8f6;
}
.badge {
  margin-left: auto;
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
  color: #8b95b5;
}
.dbx-body {
  padding: 18px;
}
.dbx-note {
  padding: 10px 18px 13px;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(255, 255, 255, 0.02);
  font-size: 0.82rem;
  line-height: 1.5;
  color: #8b95b5;
}

/* shared control styles for demos (deep so children can use them) */
.dbx :deep(.d-vals) {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 14px;
}
.dbx :deep(.d-k) {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: #8b95b5;
}
.dbx :deep(.d-n) {
  margin-top: 2px;
  font-size: 1.9rem;
  font-weight: 750;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: #fff;
  line-height: 1.15;
}
.dbx :deep(.d-n.grad) {
  background: linear-gradient(105deg, #818cf8, #34d399);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.dbx :deep(.d-row) {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-top: 16px;
}
.dbx :deep(.d-btn) {
  min-width: 56px;
  height: 42px;
  padding: 0 16px;
  border-radius: 10px;
  font-weight: 650;
  font-size: 0.92rem;
  cursor: pointer;
  color: #cbd5f0;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(148, 163, 184, 0.22);
  transition: transform 0.15s ease, filter 0.15s ease, border-color 0.15s ease;
}
.dbx :deep(.d-btn.primary) {
  color: #fff;
  background: linear-gradient(120deg, #6366f1, #4f46e5);
  border: none;
}
.dbx :deep(.d-btn:hover) {
  filter: brightness(1.1);
  transform: translateY(-1px);
  border-color: #818cf8;
}
.dbx :deep(.d-btn:active) {
  transform: translateY(0) scale(0.96);
}
.dbx :deep(.d-slider) {
  flex: 1;
  min-width: 160px;
  accent-color: #6366f1;
  height: 28px;
}
.dbx :deep(.d-mono) {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: #9aa5c6;
}
.dbx :deep(.d-mono code) {
  color: #34d399;
  background: rgba(52, 211, 153, 0.1);
  padding: 1px 6px;
  border-radius: 5px;
  font-size: 11.5px;
}
</style>

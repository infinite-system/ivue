<script setup lang="ts">
/**
 * The control box: the same conversation, scrolled by the browser. Docs
 * chrome — it exists to be flicked against the scroller above it on the
 * device doing the judging, and nothing about it is part of the example's
 * contract.
 */
import { ExampleNativeChat } from './ExampleNativeChat';

const native = new ExampleNativeChat.Class();
</script>

<template>
  <section class="enc">
    <header class="enc-head">
      <span class="enc-title">The same thread, scrolled by the browser</span>
      <span class="enc-note">
        No virtualization, no transform — a plain overflow box, for flicking against the one above
      </span>
    </header>
    <div class="enc-box">
      <div v-for="row in native.rows" :key="row.id" class="enc-msg" :class="{ mine: row.mine }">
        <div class="enc-avatar" aria-hidden="true">{{ native.initial(row) }}</div>
        <div class="enc-body">
          <div class="enc-meta">
            <span class="enc-who">{{ native.who(row) }}</span>
            <span class="enc-time">{{ native.stamp(row) }}</span>
            <span class="enc-num">#{{ row.number }}</span>
          </div>
          <p class="enc-text">{{ row.body }}</p>
          <pre v-if="row.code" class="enc-code">{{ row.code }}</pre>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.enc {
  margin: 18px 0 24px;
}
.enc-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px;
  padding: 8px 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-bottom: 0;
  border-radius: 12px 12px 0 0;
  background: rgba(148, 163, 184, 0.06);
}
.enc-title {
  font-size: 13px;
  font-weight: 600;
}
.enc-note {
  font-size: 12px;
  opacity: 0.6;
}
/* the whole point: the browser scrolls this, nothing else does */
.enc-box {
  height: min(78vh, 820px);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 0 0 14px 14px;
  background: var(--vp-c-bg, #fff);
}
.enc-msg {
  display: flex;
  gap: 10px;
  padding: 10px 18px 10px 10px;
}
.enc-msg.mine {
  background: rgba(99, 102, 241, 0.05);
}
.enc-avatar {
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: #6366f1;
}
.enc-msg.mine .enc-avatar {
  background: #0ea5e9;
}
.enc-body {
  min-width: 0;
  flex: 1 1 auto;
}
.enc-meta {
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-size: 12px;
  opacity: 0.65;
}
.enc-who {
  font-weight: 600;
  opacity: 0.9;
}
.enc-num {
  margin-left: auto;
  font-family: var(--vp-font-family-mono, monospace);
}
.enc-text {
  margin: 4px 0 0;
  line-height: 1.55;
}
.enc-code {
  margin: 8px 0 0;
  padding: 7px 8px;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.45;
  background: rgba(148, 163, 184, 0.12);
}
@media (max-width: 860px) {
  .enc-box {
    height: calc(100svh - 72px);
    min-height: 520px;
  }
}
</style>

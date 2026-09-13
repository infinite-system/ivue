<script setup lang="ts">
/**
 * The AI chat example, live in the docs. The whole example — the chat
 * over the virtual scroller, the tool cards, the index, the composer —
 * is the playground's own component; this wrapper is the docs chrome: a
 * title block above, and the chat itself full width beneath it.
 */
import ChatShell from '../../../../../examples/playground/src/examples/ai-chat/ChatShell.vue';
</script>

<template>
  <section class="eac">
    <header class="eac-head">
      <div class="eac-title">
        <span class="eac-dot" aria-hidden="true" />
        <span class="eac-t">AI chat — a real 10,000-message Claude Code session</span>
        <span class="eac-badge">Live &middot; runs the shipped engine</span>
      </div>
      <p class="eac-note">
        The thread is a real session, scrubbed. One small index arrives first; every message is a
        row from that moment on, and its content is fetched only when the window reaches its page —
        a page landing above the viewport moves nothing. Tool calls contract to batches and expand
        to their full code; the index on the right filters, selects with shift-click, and exports.
        Replies to what you type are replays of real turns, streamed at the picked model's pace.
        Nothing you type or attach leaves the tab.
      </p>
    </header>
    <div class="eac-frame">
      <ChatShell />
    </div>
  </section>
</template>

<style scoped>
.eac {
  margin: 24px 0;
}
.eac-head {
  padding: 12px 18px 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-bottom: 0;
  border-radius: 14px 14px 0 0;
  background: var(--vp-c-bg-soft);
}
.eac-title {
  display: flex;
  align-items: center;
  gap: 10px;
}
.eac-dot {
  width: 8px;
  height: 8px;
  border-radius: 3px;
  background: linear-gradient(120deg, #6366f1, #34d399);
}
.eac-t {
  font-weight: 640;
  font-size: 0.92rem;
  letter-spacing: -0.01em;
  color: var(--vp-c-text-1);
}
.eac-badge {
  margin-left: auto;
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
  color: var(--vp-c-text-3);
  white-space: nowrap;
}
.eac-note {
  margin: 8px 0 0;
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}
.eac-frame {
  height: min(78vh, 820px);
  min-height: 560px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 0 0 14px 14px;
  overflow: hidden;
  box-shadow: 0 22px 60px -28px rgba(99, 102, 241, 0.4);
}
@media (max-width: 640px) {
  /* the chat is the page on a phone: edge to edge, most of the screen */
  .eac {
    margin: 16px -24px;
  }
  .eac-head {
    border-radius: 0;
    border-left: 0;
    border-right: 0;
  }
  .eac-badge {
    display: none;
  }
  .eac-frame {
    height: calc(100dvh - 120px);
    min-height: 480px;
    border-radius: 0;
    border-left: 0;
    border-right: 0;
  }
}
</style>

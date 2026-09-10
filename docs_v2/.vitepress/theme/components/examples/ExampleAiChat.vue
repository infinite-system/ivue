<script setup lang="ts">
/**
 * The AI chat example, live in the docs. The whole example — the chat
 * over the virtual scroller, the tool cards, the index, the composer —
 * is the playground's own component; this wrapper is the docs chrome.
 */
import DemoBox from '../DemoBox.vue';
import ChatShell from '../../../../../examples/playground/src/examples/ai-chat/ChatShell.vue';
</script>

<template>
  <DemoBox
    title="AI chat — a real 10,000-message Claude Code session"
    note="The thread is a real session, scrubbed. One small index arrives first; every message is a row from that moment on, and its content is fetched only when the window reaches its page — a page landing above the viewport moves nothing. Tool calls contract to batches and expand to their full code; the index on the right filters, selects with shift-click, and exports. Replies to what you type are replays of real turns, streamed at the picked model's pace. Nothing you type or attach leaves the tab."
  >
    <div class="eac-frame">
      <ChatShell />
    </div>
  </DemoBox>
</template>

<style scoped>
.eac-frame {
  height: min(78vh, 820px);
  min-height: 560px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 10px;
  overflow: hidden;
}
</style>

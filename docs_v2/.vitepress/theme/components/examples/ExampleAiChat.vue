<script setup lang="ts">
/**
 * The AI chat example, live in the docs. The whole example — the chat
 * over the virtual scroller, the tool cards, the index, the composer —
 * is the playground's own component; this wrapper is the docs chrome: a
 * title block above, and the chat itself full width beneath it.
 */
import ChatShell from '../../../../../examples/playground/src/examples/ai-chat/ChatShell.vue';
import { ExampleFeelToggle } from './ExampleFeelToggle';

// docs chrome: the two feel choices that can only be judged by hand, live
const feel = new ExampleFeelToggle.Class('.ac-thread .virtual-scroller');
const { glide, carry } = feel;
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
        A real session, scrubbed. Every message is a row; its content is fetched only when you
        scroll to its page. Replies are replays of real turns. Nothing you type leaves the tab.
      </p>
    </header>
    <div class="eac-feel">
      <span class="eac-feel-label">flick rests by</span>
      <button
        v-for="option in feel.glideOptions"
        :key="option"
        type="button"
        class="eac-feel-btn"
        :class="{ on: feel.isGlide(option) }"
        @click="feel.pickGlide(option)"
      >
        {{ option }}
      </button>
      <span class="eac-feel-label">carries</span>
      <button
        v-for="option in feel.carryOptions"
        :key="option"
        type="button"
        class="eac-feel-btn"
        :class="{ on: feel.isCarry(option) }"
        @click="feel.pickCarry(option)"
      >
        {{ option }}
      </button>
      <span class="eac-feel-now">{{ glide }} &middot; {{ carry }}</span>
    </div>
    <div class="eac-frame">
      <ChatShell />
    </div>
  </section>
</template>

<style scoped>
.eac {
  margin: 24px 0;
}
/* docs chrome: the live feel switches, not part of the example's contract */
.eac-feel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-bottom: 0;
  border-radius: 12px 12px 0 0;
  background: rgba(148, 163, 184, 0.06);
  font-size: 12px;
}
.eac-feel-label {
  opacity: 0.6;
  margin-right: 2px;
}
.eac-feel-label:not(:first-child) {
  margin-left: 10px;
}
.eac-feel-btn {
  padding: 4px 10px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 999px;
  background: transparent;
  font: inherit;
  cursor: pointer;
}
.eac-feel-btn.on {
  border-color: var(--vp-c-brand-1, #3b82f6);
  background: var(--vp-c-brand-1, #3b82f6);
  color: #fff;
}
.eac-feel-now {
  margin-left: auto;
  opacity: 0.55;
  font-family: var(--vp-font-family-mono, monospace);
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
  margin: 6px 0 0;
  font-size: 0.72rem;
  line-height: 1.45;
  color: var(--vp-c-text-2);
}
.eac-frame {
  /* a height only: the chat draws its own two cards — the stats under this head, the
     window below them */
  height: min(78vh, 820px);
  min-height: 560px;
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
    /* svh, not dvh: the address bar folding away must not resize the chat under a reader */
    height: calc(100svh - 72px);
    min-height: 520px;
  }
}
</style>

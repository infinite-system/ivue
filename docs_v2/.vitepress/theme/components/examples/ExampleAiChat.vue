<script setup lang="ts">
/**
 * The AI chat example, live in the docs. The whole example — the chat
 * over the virtual scroller, the tool cards, the index, the composer —
 * is the playground's own component; this wrapper is the docs chrome: a
 * title block above, and the chat itself full width beneath it.
 */
import ChatShell from '../../../../../examples/playground/src/examples/ai-chat/ChatShell.vue';
import DemoBox from '../DemoBox.vue';
import { ExampleFeelToggle } from './ExampleFeelToggle';

// docs chrome: the two feel choices that can only be judged by hand, live
const feel = new ExampleFeelToggle.Class();
const {
  // state refs
  glide,
  carry,
  pixels,
  layerReset,
  // element refs
  shell
} = feel;
</script>

<template>
  <DemoBox
    class="eac"
    title="AI chat — a real 10,000-message Claude Code session"
    badge=""
    flush
    note="A real session. Every message is a row; its content is fetched only when you scroll to its page. Replies are replays of real turns. Nothing you type leaves the tab."
  >
    <div class="eac-feel">
      <div class="eac-feel-group">
        <span class="eac-feel-label">flick rests by</span>
        <div class="eac-feel-options">
          <button
            v-for="option in feel.glideOptions"
            :key="option"
            type="button"
            class="eac-feel-btn"
            :disabled="!feel.isLive"
            :class="{ on: feel.isGlide(option) }"
            @click="feel.pickGlide(option)"
          >
            {{ option }}
          </button>
        </div>
      </div>
      <div class="eac-feel-group">
        <span class="eac-feel-label">carries</span>
        <div class="eac-feel-options">
          <button
            v-for="option in feel.carryOptions"
            :key="option"
            type="button"
            class="eac-feel-btn"
            :disabled="!feel.isLive"
            :class="{ on: feel.isCarry(option) }"
            @click="feel.pickCarry(option)"
          >
            {{ option }}
          </button>
        </div>
      </div>
      <div class="eac-feel-group">
        <span class="eac-feel-label">pixels</span>
        <div class="eac-feel-options">
          <button
            v-for="option in feel.pixelOptions"
            :key="option"
            type="button"
            class="eac-feel-btn"
            :disabled="!feel.isLive"
            :class="{ on: feel.isPixels(option) }"
            @click="feel.pickPixels(option)"
          >
            {{ option }}
          </button>
        </div>
      </div>
      <div class="eac-feel-group">
        <span class="eac-feel-label">safari layer reset</span>
        <div class="eac-feel-options">
          <button
            v-for="option in feel.layerResetOptions"
            :key="option"
            type="button"
            class="eac-feel-btn"
            :disabled="!feel.isLive"
            :class="{ on: feel.isLayerReset(option) }"
            @click="feel.pickLayerReset(option)"
          >
            {{ option }}
          </button>
        </div>
      </div>
      <span class="eac-feel-now">{{ glide }} &middot; {{ carry }} &middot; {{ pixels }} &middot; reset {{ layerReset }}</span>
    </div>
    <div class="eac-frame">
      <ChatShell ref="shell" />
    </div>
  </DemoBox>
</template>

<style scoped>
/* One box. The DemoBox draws the outer border, the radius and the head; everything
   inside is a flat column divided by 1px lines, so nothing reads as a card in a card. */
.eac-feel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(148, 163, 184, 0.06);
  font-size: 12px;
}
.eac-feel-group,
.eac-feel-options {
  display: flex;
  align-items: center;
  gap: 6px;
}
.eac-feel-group + .eac-feel-group {
  margin-left: 10px;
}
.eac-feel-label {
  opacity: 0.6;
  margin-right: 2px;
}
.eac-feel-btn {
  padding: 4px 10px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 999px;
  background: transparent;
  font: inherit;
  cursor: pointer;
}
.eac-feel-btn:disabled {
  opacity: 0.4;
  cursor: default;
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
.eac-frame {
  height: min(78vh, 820px);
  min-height: 560px;
}
/* the chat draws a stats bar and a window as two cards of its own; inside this box they
   become two rows of the same column — the box owns every outer edge */
.eac-frame :deep(.ai-chat .ac-stats) {
  border-left: 0;
  border-right: 0;
  border-radius: 0;
}
.eac-frame :deep(.ai-chat .ac-window) {
  margin-top: 0;
  border-left: 0;
  border-right: 0;
  border-bottom: 0;
  border-radius: 0;
}
@media (max-width: 640px) {
  /* each knob is a label over its buttons, side by side with a rule between;
     a knob the row cannot hold drops to a second line instead of leaving the screen */
  .eac-feel {
    flex-wrap: wrap;
    align-items: stretch;
    gap: 8px 0;
  }
  .eac-feel-group {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
  .eac-feel-group + .eac-feel-group {
    margin-left: 12px;
    padding-left: 12px;
    border-left: 1px solid rgba(148, 163, 184, 0.2);
  }
  .eac-feel-now {
    display: none;
  }
  /* the chat is the page on a phone: edge to edge, most of the screen */
  .eac {
    margin: 16px -24px;
    border-radius: 0;
    border-left: 0;
    border-right: 0;
  }
  .eac-frame {
    /* svh, not dvh: the address bar folding away must not resize the chat under a reader */
    height: calc(100svh - 72px);
    min-height: 520px;
  }
}
</style>

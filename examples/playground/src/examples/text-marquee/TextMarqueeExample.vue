<script setup lang="ts">
import TextMarquee from './TextMarquee.vue';
import { TextMarqueeExample, BOOK_TEXT } from './TextMarqueeExample';

const example = new TextMarqueeExample.Class();

// the state destructure — every Ref the template touches, grouped
const {
  // state refs
  speed,
  // element refs
  marquee,
} = example;
</script>

<template>
  <div class="example">
    <header class="example-header">
      <p>{{ example.statsLabel }}</p>
      <nav>
        <button
          type="button"
          :class="{ playing: example.isPlaying }"
          @click="example.togglePlay()"
        >
          <span class="btn-icon">{{ example.playButtonIcon }}</span>
          {{ example.playButtonLabel }}
        </button>
        <label class="speed">
          speed
          <input
            v-model.number="speed"
            type="range"
            min="20"
            max="600"
            step="10"
          />
          <span class="speed-value">{{ example.speedLabel }}</span>
        </label>
      </nav>
    </header>
    <main class="example-body">
      <p class="hint">
        A ~400k-character book as ONE line. Shift+wheel or swipe scrubs it;
        the slider changes speed mid-glide — a plain vertical wheel still
        scrolls the page.
      </p>
      <TextMarquee
        ref="marquee"
        class="book-line"
        :text="BOOK_TEXT"
        :px-per-second="speed"
      />
    </main>
  </div>
</template>

<style scoped>
.example {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.example-header {
  padding: 14px 20px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}
.example-header p {
  margin: 0 0 10px;
  font-size: 13px;
  color: #8b95b5;
}
nav {
  display: flex;
  align-items: center;
  gap: 14px;
}
nav button {
  padding: 6px 12px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #dbe1f4;
  font-size: 12.5px;
  cursor: pointer;
}
nav button:hover {
  border-color: #6366f1;
}
nav .btn-icon {
  margin-right: 6px;
}
nav button.playing {
  border-color: rgba(52, 211, 153, 0.7);
  background: rgba(52, 211, 153, 0.12);
  color: #6ee7b7;
}
.speed {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: #8b95b5;
}
.speed input {
  width: 180px;
  accent-color: #6366f1;
}
.speed-value {
  min-width: 64px;
  color: #dbe1f4;
  font-variant-numeric: tabular-nums;
}
.example-body {
  flex: 1;
  min-height: 0;
  padding: 26px 20px;
  /* one line in a tall pane — let it sit at the optical center */
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.hint {
  margin: 0 0 18px;
  font-size: 13px;
  line-height: 1.6;
  color: #8b95b5;
}
.book-line {
  border-top: 1px solid rgba(148, 163, 184, 0.16);
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
  padding: 18px 0;
  font-size: 15px;
  line-height: 1.6;
  color: #dbe1f4;
  /* the line enters and leaves through a soft edge, not a hard clip */
  -webkit-mask-image: linear-gradient(
    90deg,
    transparent,
    black 5%,
    black 95%,
    transparent
  );
  mask-image: linear-gradient(
    90deg,
    transparent,
    black 5%,
    black 95%,
    transparent
  );
}
</style>

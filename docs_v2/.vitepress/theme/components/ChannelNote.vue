<script setup lang="ts">
import { computed, onMounted, watch, nextTick } from 'vue';
import { useData } from 'vitepress';

// Banner for channel posts (private HN/X/… artifacts, dev server
// only): names the destination platform and, for X threads, annotates
// every segment with its character count — the one figure that
// matters when previewing a thread.
const { frontmatter, page } = useData();
const channel = computed<string | null>(
  () => frontmatter.value.channel ?? null,
);

const CHANNEL_NAMES: Record<string, string> = {
  hn: 'Hacker News',
  reddit: 'Reddit',
  x: 'X thread',
  linkedin: 'LinkedIn',
  note: 'Planning note',
};

const X_LIMIT = 280;

function annotateThreadSegments() {
  if (channel.value !== 'x') return;
  const documentBody = document.querySelector('.vp-doc > div');
  if (!documentBody || documentBody.querySelector('.x-segment-count')) return;

  const insertCount = (
    anchor: Element | null,
    characters: number,
    segmentNumber: number,
  ) => {
    if (characters === 0) return;
    const label = document.createElement('div');
    label.className =
      'x-segment-count' + (characters > X_LIMIT ? ' x-segment-count--over' : '');
    label.textContent =
      `tweet ${segmentNumber} · ${characters} chars` +
      (characters > X_LIMIT ? ` — ${characters - X_LIMIT} over the limit` : '');
    documentBody.insertBefore(label, anchor);
  };

  let characters = 0;
  let segmentNumber = 1;
  for (const child of [...documentBody.children]) {
    if (child.tagName === 'HR') {
      insertCount(child, characters, segmentNumber);
      segmentNumber += 1;
      characters = 0;
    } else if (child.tagName !== 'H1') {
      characters += (child.textContent ?? '').trim().length;
    }
  }
  insertCount(null, characters, segmentNumber);
}

onMounted(annotateThreadSegments);
watch(
  () => page.value.relativePath,
  () => nextTick(annotateThreadSegments),
);
</script>

<template>
  <div v-if="channel" class="channel-note">
    <span class="channel-chip">{{ CHANNEL_NAMES[channel] ?? channel }}</span>
    <span class="channel-note__text">
      Private channel artifact — visible on the dev server only, never
      built into production or the newsletter.
    </span>
  </div>
</template>

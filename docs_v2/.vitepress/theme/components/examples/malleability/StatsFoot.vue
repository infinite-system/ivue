<script setup lang="ts">
import type { Kit } from '@kit/Kit';
import type { Snippet } from './Snippet';

// A swapped foot: a status bar of facts about the block, painted from its
// palette, with the copy button moved to the right.
defineProps<{ kit: Kit.Entry; model: Snippet.Instance }>();
</script>

<template>
  <footer class="stats-foot">
    <dl class="stats-list">
      <div>
        <dt>lines</dt>
        <dd>{{ model.lineCount }}</dd>
      </div>
      <div>
        <dt>chars</dt>
        <dd>{{ model.charCount }}</dd>
      </div>
      <div>
        <dt>engine</dt>
        <dd>{{ model.engineLabel }}</dd>
      </div>
      <div>
        <dt>theme</dt>
        <dd>{{ model.theme }}</dd>
      </div>
    </dl>
    <button type="button" class="snip-copy" @click="model.copyAll()">{{ model.copyLabel }}</button>
  </footer>
</template>

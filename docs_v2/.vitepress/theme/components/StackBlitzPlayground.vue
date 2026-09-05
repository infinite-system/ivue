<script setup lang="ts">
import { StackBlitzPlayground } from './StackBlitzPlayground';

declare const __IVUE_DEPLOYED_COMMIT__: string;

const playground = new StackBlitzPlayground.Class(__IVUE_DEPLOYED_COMMIT__);

// the state destructure — every Ref the template touches, grouped
const {
  // state refs
  ready,
  fallback,
  fallbackMessage,
  // element refs
  embedFrame,
} = playground;
</script>

<template>
  <div v-if="ready" class="stackblitz-playground">
    <iframe
      ref="embedFrame"
      title="ivue examples playground in StackBlitz"
      :src="playground.embedUrl"
      allow="clipboard-read; clipboard-write; cross-origin-isolated; fullscreen"
      credentialless
    />
  </div>
  <div v-else class="stackblitz-preparing" role="status">
    <template v-if="fallback">
      <span>{{ fallbackMessage }}</span>
      <a :href="playground.fullScreenUrl" target="_blank" rel="noreferrer">
        Open full screen in StackBlitz ⚡
      </a>
    </template>
    <template v-else>
      <span class="stackblitz-spinner" aria-hidden="true"></span>
      <span>Preparing the isolated StackBlitz workspace…</span>
    </template>
  </div>
</template>

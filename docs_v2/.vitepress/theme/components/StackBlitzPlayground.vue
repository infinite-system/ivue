<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { withBase } from 'vitepress';

const ready = ref(false);
const fallback = ref(false);
const fallbackMessage = ref('');
const reloadKey = 'ivue:stackblitz-coi-reload';
const embedRetryKey = 'ivue:stackblitz-embed-retry';
const embedAttempt = ref(0);
let embedRetryTimer: number | undefined;
const fullScreenUrl =
  'https://stackblitz.com/github/infinite-system/ivue/tree/main/examples/playground?file=src%2Fexamples%2Findex.ts&initialpath=%2F';

function showFallback(message: string) {
  fallbackMessage.value = message;
  fallback.value = true;
}

function startEmbed() {
  ready.value = true;

  if (sessionStorage.getItem(embedRetryKey) === '1') return;

  embedRetryTimer = window.setTimeout(() => {
    sessionStorage.setItem(embedRetryKey, '1');
    embedAttempt.value = 1;
  }, 10_000);
}

function settlesWithin(
  promise: Promise<unknown>,
  timeout: number,
): Promise<boolean> {
  return Promise.race([
    promise.then(() => true, () => false),
    new Promise<boolean>((resolve) => window.setTimeout(resolve, timeout, false)),
  ]);
}

onMounted(async () => {
  if (window.crossOriginIsolated) {
    sessionStorage.removeItem(reloadKey);
    startEmbed();
    return;
  }

  if (!window.isSecureContext) {
    showFallback(
      'The embedded workspace needs HTTPS. Open the full StackBlitz workspace while using this local server.',
    );
    return;
  }

  if (!('serviceWorker' in navigator)) {
    showFallback('This browser cannot prepare the embedded StackBlitz workspace.');
    return;
  }

  if (sessionStorage.getItem(reloadKey) === '1') {
    showFallback('This browser cannot prepare the embedded StackBlitz workspace.');
    return;
  }

  try {
    await navigator.serviceWorker.register(
      withBase('/examples/coi-serviceworker.js'),
    );
    const workerIsReady = await settlesWithin(navigator.serviceWorker.ready, 5_000);

    if (!workerIsReady) {
      showFallback(
        'The embedded StackBlitz workspace could not start in this browser.',
      );
      return;
    }

    sessionStorage.setItem(reloadKey, '1');
    window.location.reload();
  } catch {
    showFallback('The embedded StackBlitz workspace could not be prepared.');
  }
});

onBeforeUnmount(() => {
  window.clearTimeout(embedRetryTimer);
});
</script>

<template>
  <div v-if="ready" class="stackblitz-playground">
    <iframe
      title="ivue examples playground in StackBlitz"
      :key="embedAttempt"
      src="https://stackblitz.com/github/infinite-system/ivue/tree/main/examples/playground?embed=1&file=src%2Fexamples%2Findex.ts&initialpath=%2F&view=both&hidedevtools=1&hideNavigation=1&showSidebar=1"
      allow="clipboard-read; clipboard-write; cross-origin-isolated; fullscreen"
      credentialless
    />
  </div>
  <div v-else class="stackblitz-preparing" role="status">
    <template v-if="fallback">
      <span>{{ fallbackMessage }}</span>
      <a :href="fullScreenUrl" target="_blank" rel="noreferrer">
        Open full screen in StackBlitz ⚡
      </a>
    </template>
    <template v-else>
      <span class="stackblitz-spinner" aria-hidden="true"></span>
      <span>Preparing the isolated StackBlitz workspace…</span>
    </template>
  </div>
</template>

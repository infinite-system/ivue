<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { withBase } from 'vitepress';

declare const __IVUE_DEPLOYED_COMMIT__: string;

const ready = ref(false);
const fallback = ref(false);
const fallbackMessage = ref('');
const reloadKey = 'ivue:stackblitz-coi-reload';

// StackBlitz's first embedded GitHub import sometimes stalls before the
// workspace boots. Changing this query value after ten seconds forces one
// fresh iframe navigation, which lets StackBlitz reuse the import it just
// prepared. Keep this to one retry: it is a first-load workaround, not a
// polling loop, and the commit-pinned project URL must otherwise stay stable.
// The retry fires ONLY when the workspace has not booted: the StackBlitz
// SDK handshake (sdk.connect) resolves exactly when the embed is alive —
// a successful first load cancels the timer instead of reloading.
const embedAttempt = ref(0);
const embedRetryDelay = 10_000;
let embedRetryTimer: number | undefined;
const embedFrame = ref<HTMLIFrameElement | null>(null);
let embedBooted = false;

async function watchEmbedBoot() {
  const frame = embedFrame.value;
  if (!frame) return;

  try {
    const { default: sdk } = await import('@stackblitz/sdk');
    await sdk.connect(frame);
    embedBooted = true;
    window.clearTimeout(embedRetryTimer);
  } catch {
    // no handshake — the retry timer stays armed and decides
  }
}
const deployedRef = __IVUE_DEPLOYED_COMMIT__ || 'main';
const stackBlitzProjectUrl =
  `https://stackblitz.com/github/infinite-system/ivue/tree/${deployedRef}/examples/playground`;

// Example pages deep-link here with ?file= and ?path=, so the embed
// opens on that example's class with its route running.
const embedFile = ref('src/examples/index.ts');
const embedPath = ref('/');
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  const requestedFile = params.get('file');
  const requestedPath = params.get('path');
  if (requestedFile) embedFile.value = requestedFile;
  if (requestedPath) embedPath.value = requestedPath;
}

const fullScreenUrl = computed(
  () =>
    `${stackBlitzProjectUrl}?file=${encodeURIComponent(embedFile.value)}&initialpath=${encodeURIComponent(embedPath.value)}`,
);
const embedUrl = computed(
  () =>
    `${stackBlitzProjectUrl}?embed=1&file=${encodeURIComponent(embedFile.value)}&initialpath=${encodeURIComponent(embedPath.value)}&view=both&hidedevtools=1&hideNavigation=1&showSidebar=1&ivueRetry=` +
    embedAttempt.value,
);

function showFallback(message: string) {
  fallbackMessage.value = message;
  fallback.value = true;
}

function startEmbed() {
  ready.value = true;
  void nextTick(() => watchEmbedBoot());

  embedRetryTimer = window.setTimeout(() => {
    if (embedBooted) return;
    embedAttempt.value = 1;
    void nextTick(() => watchEmbedBoot());
  }, embedRetryDelay);
}

function activatesWithin(
  registration: ServiceWorkerRegistration,
  timeout: number,
): Promise<boolean> {
  const worker =
    registration.active ?? registration.waiting ?? registration.installing;

  if (!worker) return Promise.resolve(false);
  if (worker.state === 'activated') return Promise.resolve(true);

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => finish(false), timeout);

    const onStateChange = () => {
      if (worker.state === 'activated') finish(true);
      if (worker.state === 'redundant') finish(false);
    };

    const finish = (activated: boolean) => {
      window.clearTimeout(timer);
      worker.removeEventListener('statechange', onStateChange);
      resolve(activated);
    };

    worker.addEventListener('statechange', onStateChange);
    onStateChange();
  });
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
    const registration = await navigator.serviceWorker.register(
      withBase('/examples/coi-serviceworker.js'),
    );
    const workerIsActive = await activatesWithin(registration, 15_000);

    if (!workerIsActive) {
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
      ref="embedFrame"
      title="ivue examples playground in StackBlitz"
      :src="embedUrl"
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

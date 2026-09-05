// StackBlitzPlayground.ts — the embedded StackBlitz workspace's model: the
// cross-origin-isolation handshake (service worker + one reload), the
// commit-pinned project URL, the ?file= / ?path= deep link, and the
// one-retry boot watchdog.
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { withBase } from 'vitepress';
import { Reactive } from '../../../../lib/Reactive';
import { Static } from '../../../../lib/Static';

class $StackBlitzPlayground {
  /* Knobs — STATIC */

  static get RELOAD_KEY() {
    return 'ivue:stackblitz-coi-reload';
  }

  /** StackBlitz's first embedded GitHub import sometimes stalls before the
   *  workspace boots. After this delay one fresh iframe navigation lets
   *  StackBlitz reuse the import it just prepared. One retry only: a
   *  first-load workaround, not a polling loop. */
  static get EMBED_RETRY_DELAY_MS() {
    return 10_000;
  }

  static get WORKER_ACTIVATION_TIMEOUT_MS() {
    return 15_000;
  }

  static get SERVICE_WORKER_PATH() {
    return '/examples/coi-serviceworker.js';
  }

  static get DEFAULT_FILE() {
    return 'src/examples/index.ts';
  }

  static get DEFAULT_PATH() {
    return '/';
  }

  /** `deployedCommit` is the commit the site was deployed from (a build-time
   *  define) — the project URL pins to it, falling back to `main`. */
  constructor(readonly deployedCommit: string) {
    this.readDeepLink();
    onMounted(() => this.prepare());
    onBeforeUnmount(() => this.dispose());
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $StackBlitzPlayground;
  }

  // MUTABLE STATE
  get ready() {
    return ref(false);
  }

  get fallback() {
    return ref(false);
  }

  get fallbackMessage() {
    return ref('');
  }

  get embedAttempt() {
    return ref(0);
  }

  get embedBooted() {
    return ref(false);
  }

  get embedRetryTimer() {
    return ref<number | undefined>(undefined);
  }

  /** Example pages deep-link here with ?file= and ?path=, so the embed
   *  opens on that example's class with its route running. */
  get embedFile() {
    return ref(this.self.DEFAULT_FILE);
  }

  get embedPath() {
    return ref(this.self.DEFAULT_PATH);
  }

  // TEMPLATE-REF TARGET
  get embedFrame() {
    return ref<HTMLIFrameElement | null>(null);
  }

  // DERIVED — plain getters
  get deployedRef() {
    return this.deployedCommit || 'main';
  }

  get projectUrl() {
    return `https://stackblitz.com/github/infinite-system/ivue/tree/${this.deployedRef}/examples/playground`;
  }

  get fileQuery() {
    return `file=${encodeURIComponent(this.embedFile.value)}&initialpath=${encodeURIComponent(this.embedPath.value)}`;
  }

  get fullScreenUrl() {
    return `${this.projectUrl}?${this.fileQuery}`;
  }

  get embedUrl() {
    return `${this.projectUrl}?embed=1&${this.fileQuery}&view=both&hidedevtools=1&hideNavigation=1&showSidebar=1&ivueRetry=${this.embedAttempt.value}`;
  }

  // ACTIONS
  readDeepLink() {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const requestedFile = params.get('file');
    const requestedPath = params.get('path');
    if (requestedFile) this.embedFile.value = requestedFile;
    if (requestedPath) this.embedPath.value = requestedPath;
  }

  /** On mount: embed straight away when the page is already isolated;
   *  otherwise register the COI service worker and reload once. */
  async prepare() {
    if (window.crossOriginIsolated) {
      sessionStorage.removeItem(this.self.RELOAD_KEY);
      this.startEmbed();
      return;
    }
    if (!window.isSecureContext) {
      this.showFallback('The embedded workspace needs HTTPS. Open the full StackBlitz workspace while using this local server.');
      return;
    }
    if (!('serviceWorker' in navigator)) {
      this.showFallback('This browser cannot prepare the embedded StackBlitz workspace.');
      return;
    }
    if (sessionStorage.getItem(this.self.RELOAD_KEY) === '1') {
      this.showFallback('This browser cannot prepare the embedded StackBlitz workspace.');
      return;
    }
    try {
      const registration = await navigator.serviceWorker.register(withBase(this.self.SERVICE_WORKER_PATH));
      const workerIsActive = await this.activatesWithin(registration, this.self.WORKER_ACTIVATION_TIMEOUT_MS);
      if (!workerIsActive) {
        this.showFallback('The embedded StackBlitz workspace could not start in this browser.');
        return;
      }
      sessionStorage.setItem(this.self.RELOAD_KEY, '1');
      window.location.reload();
    } catch {
      this.showFallback('The embedded StackBlitz workspace could not be prepared.');
    }
  }

  showFallback(message: string) {
    this.fallbackMessage.value = message;
    this.fallback.value = true;
  }

  /** The retry fires ONLY when the workspace has not booted: the SDK
   *  handshake resolves exactly when the embed is alive, and a successful
   *  first load cancels the timer instead of reloading. */
  startEmbed() {
    this.ready.value = true;
    void nextTick(() => this.watchEmbedBoot());
    this.embedRetryTimer.value = window.setTimeout(() => this.retryEmbed(), this.self.EMBED_RETRY_DELAY_MS);
  }

  retryEmbed() {
    if (this.embedBooted.value) return;
    this.embedAttempt.value = 1;
    void nextTick(() => this.watchEmbedBoot());
  }

  async watchEmbedBoot() {
    const frame = this.embedFrame.value;
    if (!frame) return;
    try {
      const { default: sdk } = await import('@stackblitz/sdk');
      await sdk.connect(frame);
      this.embedBooted.value = true;
      window.clearTimeout(this.embedRetryTimer.value);
    } catch {
      // no handshake — the retry timer stays armed and decides
    }
  }

  activatesWithin(registration: ServiceWorkerRegistration, timeout: number): Promise<boolean> {
    const worker = registration.active ?? registration.waiting ?? registration.installing;
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

  dispose() {
    window.clearTimeout(this.embedRetryTimer.value);
  }
}

export namespace StackBlitzPlayground {
  export const $Class = Static($StackBlitzPlayground); // anchor — it declares statics
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}

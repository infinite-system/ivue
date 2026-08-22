<script setup lang="ts">
import { ref, watch } from 'vue';
import { captureEvent } from '../analytics';

// The one-line signup riding the blog toolbar: Name, Email, [Join].
// Same endpoint and invisible Turnstile as the full card — this is the
// fast lane, not a separate system.
const NEWSLETTER_ENDPOINT = 'https://ivue-newsletter.ekalashnikov.workers.dev';
const TURNSTILE_SITE_KEY = '0x4AAAAAAESFVS2C9LMeYZpt';

const name = ref('');
const email = ref('');
const state = ref<'idle' | 'sending' | 'done' | 'error'>('idle');
const message = ref('');

// --- Turnstile (explicit render, invisible unless challenged) --------
const turnstileElement = ref<HTMLElement | null>(null);
const turnstileToken = ref('');
let turnstileWidgetId: string | undefined;
let turnstileScriptPromise: Promise<void> | undefined;

function loadTurnstileScript(): Promise<void> {
  turnstileScriptPromise ??= new Promise((resolve) => {
    const script = document.createElement('script');
    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => resolve());
    document.head.appendChild(script);
  });
  return turnstileScriptPromise;
}

async function renderTurnstile() {
  if (!TURNSTILE_SITE_KEY || !turnstileElement.value || turnstileWidgetId)
    return;
  await loadTurnstileScript();
  const turnstile = (window as any).turnstile;
  if (!turnstile || !turnstileElement.value) return;
  turnstileWidgetId = turnstile.render(turnstileElement.value, {
    sitekey: TURNSTILE_SITE_KEY,
    action: 'newsletter',
    theme: 'dark',
    appearance: 'interaction-only',
    callback: (token: string) => {
      turnstileToken.value = token;
    },
    'expired-callback': () => {
      turnstileToken.value = '';
    },
  });
}

watch(turnstileElement, (element) => {
  if (element) renderTurnstile();
});

async function join() {
  if (!email.value || state.value === 'sending') return;
  state.value = 'sending';
  try {
    const response = await fetch(`${NEWSLETTER_ENDPOINT}/subscribe`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: name.value,
        email: email.value,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
        ...(turnstileToken.value
          ? { turnstileToken: turnstileToken.value }
          : {}),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok) {
      state.value = 'done';
      captureEvent('newsletter_signup', { placement: 'blog-inline' });
    } else {
      state.value = 'error';
      message.value =
        payload.error ?? 'Could not subscribe — try again in a minute.';
    }
  } catch {
    state.value = 'error';
    message.value = 'Could not subscribe — try again in a minute.';
  } finally {
    turnstileToken.value = '';
    if (turnstileWidgetId) (window as any).turnstile?.reset(turnstileWidgetId);
  }
}
</script>

<template>
  <form
    v-if="state !== 'done'"
    class="quickjoin"
    aria-label="Newsletter quick signup"
    @submit.prevent="join()"
  >
    <span class="quickjoin__lead">Join the frontier — this blog, as a newsletter</span>
    <div class="quickjoin__group">
      <input
        v-model="name"
        type="text"
        class="quickjoin__input quickjoin__input--name"
        placeholder="Name"
        autocomplete="given-name"
        aria-label="Name"
      />
      <input
        v-model="email"
        type="email"
        class="quickjoin__input quickjoin__input--email"
        placeholder="Email"
        autocomplete="email"
        aria-label="Email"
        required
      />
      <button class="quickjoin__button" type="submit" :disabled="state === 'sending'">
        <span class="newsletter__button-shine" aria-hidden="true"></span>
        <span class="quickjoin__button-text">
          {{ state === 'sending' ? 'Joining…' : 'Join' }}
          <svg v-if="state !== 'sending'" class="quickjoin__plane" viewBox="0 0 24 24" aria-hidden="true">
            <!-- folded paper plane: three facets, opacity carries the 3D -->
            <path fill="currentColor" d="M22 3 3 10.5l7.5 1.7L22 3Z" />
            <path fill="currentColor" fill-opacity="0.72" d="M22 3 10.5 12.2l1.6 8.3L22 3Z" />
            <path fill="currentColor" fill-opacity="0.45" d="M10.5 12.2l1.6 8.3-2.6-5.4 1-2.9Z" />
          </svg>
        </span>
      </button>
    </div>
    <div ref="turnstileElement" class="quickjoin__turnstile"></div>
    <span v-if="state === 'error'" class="quickjoin__error" role="alert">
      {{ message }}
    </span>
  </form>
  <p v-else class="quickjoin quickjoin--done" role="status">
    ✓ Welcome aboard — see you in your inbox.
  </p>
</template>

<style scoped>
.quickjoin {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
  flex-wrap: wrap;
}
.quickjoin__lead {
  font-size: 12.5px;
  color: var(--vp-c-text-3);
  white-space: nowrap;
}
/* the trio is ONE segmented block: name | email | join */
.quickjoin__group {
  display: flex;
  align-items: stretch;
}
.quickjoin__input {
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}
.quickjoin__input:focus {
  outline: none;
  border-color: #2dd4bf;
  box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.18);
  position: relative;
  z-index: 1;
}
.quickjoin__input--name {
  width: 104px;
  border-radius: 9px 0 0 9px;
  border-right: none;
}
.quickjoin__input--email {
  width: 180px;
  border-radius: 0;
}
.quickjoin__button {
  position: relative;
  overflow: hidden;
  height: 36px;
  padding: 0 16px;
  border: none;
  border-radius: 0 9px 9px 0;
  background: linear-gradient(105deg, #6366f1, #2dd4bf 70%, #34d399);
  color: #f4f9ff;
  text-shadow: 0 1px 2px rgba(2, 6, 23, 0.45);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: filter 0.18s ease, transform 0.12s ease, box-shadow 0.18s ease;
  box-shadow: 0 8px 22px -10px rgba(99, 102, 241, 0.55);
}
.quickjoin__button:hover {
  filter: brightness(1.12);
  box-shadow: 0 10px 28px -10px rgba(45, 212, 191, 0.65);
}
.quickjoin__button:active {
  transform: translateY(1px) scale(0.99);
}
.quickjoin__button:disabled {
  opacity: 0.6;
  cursor: default;
}
.quickjoin__button:hover :deep(.newsletter__button-shine) {
  animation: newsletter-button-shine 0.85s cubic-bezier(0.25, 0.6, 0.35, 1) forwards;
}
.quickjoin__button-text {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
}
.quickjoin__plane {
  width: 14px;
  height: 14px;
  transform: translateY(1.5px);
  filter: drop-shadow(0 1px 2px rgba(2, 6, 23, 0.45));
  transition: transform 0.2s ease;
}
.quickjoin__button:hover .quickjoin__plane {
  transform: translate(1px, 0.5px);
}
.quickjoin--done {
  margin: 0 0 0 auto;
  font-size: 13.5px;
  color: var(--vp-c-brand-1);
  white-space: nowrap;
}
.quickjoin__error {
  flex-basis: 100%;
  text-align: right;
  font-size: 12px;
  color: #f66;
}
/* the invisible interaction-only widget holds no space until challenged */
.quickjoin__turnstile:empty {
  display: none;
}
@media (max-width: 1080px) {
  .quickjoin__lead {
    display: none;
  }
}
@media (max-width: 860px) {
  .quickjoin {
    margin-left: 0;
    flex-basis: 100%;
  }
  .quickjoin--done {
    margin-left: 0;
  }
}
</style>

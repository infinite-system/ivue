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
    <span class="quickjoin__lead">Get this blog as a newsletter</span>
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
    <div ref="turnstileElement" class="quickjoin__turnstile"></div>
    <button class="quickjoin__button" type="submit" :disabled="state === 'sending'">
      {{ state === 'sending' ? 'Joining…' : 'Join' }}
    </button>
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
  gap: 8px;
  margin-left: auto;
  flex-wrap: wrap;
}
.quickjoin__lead {
  font-size: 12.5px;
  color: var(--vp-c-text-3);
  white-space: nowrap;
}
.quickjoin__input {
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 13.5px;
  transition: border-color 0.15s ease;
}
.quickjoin__input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}
.quickjoin__input--name {
  width: 108px;
}
.quickjoin__input--email {
  width: 180px;
}
.quickjoin__button {
  height: 38px;
  padding: 0 18px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: var(--vp-c-brand-1);
  color: #fff;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}
.quickjoin__button:hover {
  background: var(--vp-c-brand-2);
}
.quickjoin__button:disabled {
  opacity: 0.6;
  cursor: default;
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

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useId, watch } from 'vue';
import { useRoute } from 'vitepress';
import { captureEvent } from '../analytics';

// The newsletter Worker's public URL (see /newsletter/README.md) — paste
// it here once the Worker is deployed and signups go live. Empty string
// keeps the form visible but dormant (soft-fail message on submit).
const NEWSLETTER_ENDPOINT = 'https://ivue-newsletter.ekalashnikov.workers.dev';

// Turnstile sitekey (dashboard → Turnstile → the ivue.dev widget). Empty
// string skips the widget; the Worker enforces verification only once
// its TURNSTILE_SECRET is set, so the two roll out together.
const TURNSTILE_SITE_KEY = '0x4AAAAAAESFVS2C9LMeYZpt';

const props = defineProps<{ placement: 'toast' | 'aside' | 'doc' | 'cta' }>();

// The card renders in several placements at once (aside + doc on blog
// posts, one hidden by CSS) — a shared gradient id would resolve into the
// display:none instance and paint nothing. Every instance gets its own.
const markGradientId = useId();

const route = useRoute();
const isBlogPost = computed(
  () => /^\/blog\/.+/.test(route.path) && !route.path.endsWith('/blog/'),
);

// toast+pill ride every page (desktop); the mobile in-flow CTA closes
// every NON-blog page; the aside/doc inline variants are blog-only.
const belongsHere = computed(() => {
  if (props.placement === 'toast') return true;
  if (props.placement === 'cta') return !isBlogPost.value;
  return isBlogPost.value;
});

const DISMISSED_KEY = 'ivue-newsletter-dismissed';
const DISMISS_DAYS = 21;

const toastVisible = ref(false);
const mounted = ref(false);
const name = ref('');
const email = ref('');
const state = ref<'idle' | 'sending' | 'done' | 'error'>('idle');
const message = ref('');

onMounted(() => {
  mounted.value = true;
  if (props.placement !== 'toast') return;
  const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) ?? 0);
  if (Date.now() - dismissedAt < DISMISS_DAYS * 86_400_000) return;
  window.setTimeout(() => {
    if (!isBlogPost.value) toastVisible.value = true;
  }, 9_000);
});



function dismiss() {
  toastVisible.value = false;
  localStorage.setItem(DISMISSED_KEY, String(Date.now()));
}

// The pill is the permanent, on-demand doorway: always present on
// non-blog pages once the card is closed.
const pillVisible = computed(
  () =>
    props.placement === 'toast' &&
    mounted.value &&
    belongsHere.value &&
    !toastVisible.value,
);

function openFromPill() {
  state.value = 'idle';
  message.value = '';
  toastVisible.value = true;
  captureEvent('newsletter_form_opened', { source: 'pill' });
}

// Any page can request the signup form via this event (e.g. the
// community page's subscribe button). Where the mobile in-flow form is
// on the page, scroll to it; otherwise pop the desktop toast.
function onOpenRequested() {
  const inFlowForm = document.querySelector<HTMLElement>('.newsletter--cta');
  if (inFlowForm && inFlowForm.offsetParent !== null) {
    inFlowForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  openFromPill();
}

onMounted(() => {
  if (props.placement === 'toast') {
    window.addEventListener('ivue:newsletter-open', onOpenRequested);
  }
});
onUnmounted(() => {
  if (props.placement === 'toast') {
    window.removeEventListener('ivue:newsletter-open', onOpenRequested);
  }
});

// --- Turnstile (explicit render, per-instance widget, reset after each
// attempt — tokens are single-use) -----------------------------------
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
    // invisible unless Turnstile actually needs the visitor to interact —
    // the passive "Success!" badge never shows
    appearance: 'interaction-only',
    callback: (token: string) => {
      turnstileToken.value = token;
    },
    'expired-callback': () => {
      turnstileToken.value = '';
    },
  });
}

function resetTurnstile() {
  turnstileToken.value = '';
  if (turnstileWidgetId) (window as any).turnstile?.reset(turnstileWidgetId);
}

watch(turnstileElement, (element) => {
  if (element) renderTurnstile();
});

async function subscribe() {
  if (!email.value || state.value === 'sending') return;
  if (!NEWSLETTER_ENDPOINT) {
    state.value = 'error';
    message.value = 'Signups open very soon — follow @evgenykalash on X meanwhile.';
    return;
  }
  state.value = 'sending';
  try {
    const response = await fetch(`${NEWSLETTER_ENDPOINT}/subscribe`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: name.value,
        email: email.value,
        // the drip sends at the subscriber's LOCAL morning — the browser
        // knows the IANA zone for free
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
        ...(turnstileToken.value ? { turnstileToken: turnstileToken.value } : {}),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok) {
      state.value = 'done';
      message.value = 'Welcome aboard — see you in the next post.';
      captureEvent('newsletter_signup', { placement: props.placement });
      // long enough to actually read the confirmation
      window.setTimeout(() => (toastVisible.value = false), 8_000);
    } else {
      state.value = 'error';
      message.value =
        payload.error ?? 'Could not subscribe right now — try again in a minute.';
    }
  } catch {
    state.value = 'error';
    message.value = 'Could not subscribe right now — try again in a minute.';
  } finally {
    // tokens are single-use — a fresh widget state for any retry
    resetTurnstile();
  }
}
</script>

<template>
  <Transition name="newsletter-slide">
    <div
      v-if="belongsHere && (placement !== 'toast' || toastVisible)"
      class="newsletter"
      :class="`newsletter--${placement}`"
      role="complementary"
      aria-label="Newsletter signup"
    >
      <button
        v-if="placement === 'toast'"
        type="button"
        class="newsletter__close"
        aria-label="Dismiss"
        @click="dismiss"
      >×</button>
      <div class="newsletter__head">
        <svg class="newsletter__mark" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect width="48" height="48" rx="12" fill="#0D1226" />
          <rect x="0.5" y="0.5" width="47" height="47" rx="11.5" stroke="white" stroke-opacity="0.08" />
          <path
            d="M10.6 24 C 10.6 17.6, 19 17, 24 24 C 29 31, 37.4 30.4, 37.4 24 C 37.4 17.6, 29 17, 24 24 C 19 31, 10.6 30.4, 10.6 24 Z"
            :stroke="`url(#${markGradientId})`" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          <defs>
            <linearGradient :id="markGradientId" x1="8" y1="14" x2="40" y2="34" gradientUnits="userSpaceOnUse">
              <stop stop-color="#818CF8" />
              <stop offset="1" stop-color="#34D399" />
            </linearGradient>
          </defs>
        </svg>
        <div class="newsletter__heading">
          <span class="newsletter__label">ivue blog newsletter</span>
          <span class="newsletter__title">Join the frontier</span>
        </div>
      </div>
      <p class="newsletter__pitch">
        New patterns, releases, and measured numbers from the
        JavaScript frontier — the whole blog in {{ $archiveDays }}
        days, one post every other day, at your local morning.
      </p>
      <p
        v-if="(placement === 'toast' || placement === 'aside') && state !== 'done'"
        class="newsletter__quick-lead"
      >
        Get the blog as a newsletter
      </p>
      <form v-if="state !== 'done'" class="newsletter__form" @submit.prevent="subscribe">
        <div class="newsletter__row">
          <input
            v-model="name"
            type="text"
            name="FNAME"
            placeholder="Name"
            autocomplete="given-name"
          />
          <input
            v-model="email"
            type="email"
            name="EMAIL"
            placeholder="Email"
            autocomplete="email"
            required
          />
        </div>
        <button type="submit" :disabled="state === 'sending'">
          <span class="newsletter__button-shine" aria-hidden="true"></span>
          <span class="newsletter__button-text">
            {{ state === 'sending' ? 'Joining…' : 'Join the list' }}
            <svg v-if="state !== 'sending'" class="newsletter__plane" viewBox="0 0 24 24" aria-hidden="true">
              <!-- folded paper plane: three facets, opacity carries the 3D -->
              <path fill="currentColor" d="M22 3 3 10.5l7.5 1.7L22 3Z" />
              <path fill="currentColor" fill-opacity="0.72" d="M22 3 10.5 12.2l1.6 8.3L22 3Z" />
              <path fill="currentColor" fill-opacity="0.45" d="M10.5 12.2l1.6 8.3-2.6-5.4 1-2.9Z" />
            </svg>
          </span>
        </button>
        <div
          v-if="TURNSTILE_SITE_KEY"
          ref="turnstileElement"
          class="newsletter__turnstile"
        ></div>
      </form>
      <div v-if="state === 'done'" class="newsletter__success" role="status">
        <svg class="newsletter__check" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="11" fill="currentColor" fill-opacity="0.14" />
          <circle cx="12" cy="12" r="11" stroke="currentColor" stroke-width="1.6" />
          <path
            d="M7 12.4 10.4 16 17 8.8"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <p>{{ message }}</p>
      </div>
      <p
        v-else-if="message"
        class="newsletter__message"
        :class="{ error: state === 'error' }"
      >
        {{ message }}
      </p>
    </div>
  </Transition>
  <Transition name="newsletter-slide">
    <button
      v-if="pillVisible"
      type="button"
      class="newsletter-pill"
      aria-label="Open newsletter signup"
      @click="openFromPill"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm8 7.35L4.4 6h15.2L12 11.35ZM4 8.24V18h16V8.24l-7.45 5.3a1 1 0 0 1-1.1 0L4 8.24Z"/></svg>
      <span class="newsletter-pill__text">Newsletter</span>
    </button>
  </Transition>
</template>

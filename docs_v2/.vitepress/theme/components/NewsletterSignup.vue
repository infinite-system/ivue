<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vitepress';

// Paste the Mailchimp embedded-form action URL here once the audience
// exists (Audience → Signup forms → Embedded → the <form action="…">).
// The component converts it to the post-json JSONP endpoint itself.
const MAILCHIMP_ACTION = '';

const props = defineProps<{ placement: 'toast' | 'aside' | 'doc' }>();

const route = useRoute();
const isBlogPost = computed(
  () => /^\/blog\/.+/.test(route.path) && !route.path.endsWith('/blog/'),
);

// toast shows everywhere EXCEPT blog posts (they carry the inline form);
// aside/doc variants show ONLY on blog posts.
const belongsHere = computed(() =>
  props.placement === 'toast' ? !isBlogPost.value : isBlogPost.value,
);

const SUBSCRIBED_KEY = 'ivue-newsletter-subscribed';
const DISMISSED_KEY = 'ivue-newsletter-dismissed';
const DISMISS_DAYS = 21;

const toastVisible = ref(false);
const subscribed = ref(false);
const mounted = ref(false);
const name = ref('');
const email = ref('');
const state = ref<'idle' | 'sending' | 'done' | 'error'>('idle');
const message = ref('');

onMounted(() => {
  if (props.placement !== 'toast') return;
  mounted.value = true;
  subscribed.value = Boolean(localStorage.getItem(SUBSCRIBED_KEY));
  if (subscribed.value) return;
  const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) ?? 0);
  if (Date.now() - dismissedAt < DISMISS_DAYS * 86_400_000) return;
  window.setTimeout(() => (toastVisible.value = true), 9_000);
});

function dismiss() {
  toastVisible.value = false;
  localStorage.setItem(DISMISSED_KEY, String(Date.now()));
}

// The pill is the permanent, on-demand doorway: always present on
// non-blog pages once the card is closed (until the visitor subscribes).
const pillVisible = computed(
  () =>
    props.placement === 'toast' &&
    mounted.value &&
    belongsHere.value &&
    !toastVisible.value &&
    !subscribed.value,
);

function openFromPill() {
  state.value = 'idle';
  message.value = '';
  toastVisible.value = true;
}

function subscribe() {
  if (!email.value || state.value === 'sending') return;
  if (!MAILCHIMP_ACTION) {
    state.value = 'error';
    message.value = 'Signups open very soon — follow @evgenykalash on X meanwhile.';
    return;
  }
  state.value = 'sending';
  const endpoint = MAILCHIMP_ACTION.replace('/post?', '/post-json?');
  const callbackName = `ivueNewsletterCallback${Date.now()}`;
  const query =
    `&EMAIL=${encodeURIComponent(email.value)}` +
    `&FNAME=${encodeURIComponent(name.value)}` +
    `&c=${callbackName}`;
  (window as any)[callbackName] = (response: { result: string; msg: string }) => {
    delete (window as any)[callbackName];
    if (response.result === 'success') {
      state.value = 'done';
      message.value = 'Welcome aboard — see you in the next post.';
      localStorage.setItem(SUBSCRIBED_KEY, '1');
      subscribed.value = true;
      window.setTimeout(() => (toastVisible.value = false), 2_500);
    } else {
      state.value = 'error';
      message.value = response.msg.replace(/^\d+\s*-\s*/, '');
    }
  };
  const script = document.createElement('script');
  script.src = endpoint + query;
  document.body.appendChild(script);
  script.addEventListener('load', () => script.remove());
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
            stroke="url(#newsletter-mark-gradient)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          <defs>
            <linearGradient id="newsletter-mark-gradient" x1="8" y1="14" x2="40" y2="34" gradientUnits="userSpaceOnUse">
              <stop stop-color="#818CF8" />
              <stop offset="1" stop-color="#34D399" />
            </linearGradient>
          </defs>
        </svg>
        <div class="newsletter__heading">
          <span class="newsletter__label">ivue newsletter</span>
          <span class="newsletter__title">Follow the frontier</span>
        </div>
      </div>
      <p class="newsletter__pitch">
        New patterns, releases, and measured numbers from the edge of
        what JavaScript can do — only when something real ships.
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
            placeholder="you@work.dev"
            autocomplete="email"
            required
          />
        </div>
        <button type="submit" :disabled="state === 'sending'">
          <span class="newsletter__button-shine" aria-hidden="true"></span>
          <span class="newsletter__button-text">
            {{ state === 'sending' ? 'Joining…' : 'Join the list' }}
            <svg v-if="state !== 'sending'" class="newsletter__plane" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M2.4 11.06 21.15 3.4c.9-.37 1.82.47 1.5 1.4l-5.5 16.03c-.33.95-1.63 1.03-2.07.12l-2.9-5.98a1.1 1.1 0 0 0-.51-.51l-5.98-2.9c-.91-.44-.84-1.75.11-2.08Zm3.35 1.1 4.05 1.96c.5.24.9.65 1.15 1.15l1.96 4.04 4.42-12.9L5.75 12.17Z"/></svg>
          </span>
        </button>
      </form>
      <p v-if="message" class="newsletter__message" :class="{ error: state === 'error' }">
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
      <span>Newsletter</span>
    </button>
  </Transition>
</template>

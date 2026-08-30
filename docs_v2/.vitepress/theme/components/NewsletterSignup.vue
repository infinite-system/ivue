<script setup lang="ts">
import { NewsletterSignup } from './NewsletterSignup';

const props = defineProps<{ placement: 'toast' | 'aside' | 'doc' | 'cta' }>();

const signup = new NewsletterSignup.Class(props);

// the state destructure
const {
  // state refs
  name,
  email,
  message,
  // element refs
  turnstileElement,
} = signup;
</script>

<template>
  <Transition name="newsletter-slide">
    <div
      v-if="signup.cardVisible"
      class="newsletter"
      :class="signup.placementClass"
      role="complementary"
      aria-label="Newsletter signup"
    >
      <button
        v-if="signup.dismissable"
        type="button"
        class="newsletter__close"
        aria-label="Dismiss"
        @click="signup.dismiss()"
      >×</button>
      <div class="newsletter__head">
        <svg class="newsletter__mark" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect x="1" y="1" width="46" height="46" rx="11" :fill="`url(#${signup.markTileGradientId})`" />
          <path
            d="M10.6 24 C 10.6 17.6, 19 17, 24 24 C 29 31, 37.4 30.4, 37.4 24 C 37.4 17.6, 29 17, 24 24 C 19 31, 10.6 30.4, 10.6 24 Z"
            :stroke="`url(#${signup.markGradientId})`" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          <defs>
            <linearGradient :id="signup.markTileGradientId" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop stop-color="#6366F1" />
              <stop offset="1" stop-color="#34D399" />
            </linearGradient>
            <linearGradient :id="signup.markGradientId" x1="10" y1="16" x2="38" y2="32" gradientUnits="userSpaceOnUse">
              <stop stop-color="#BAE6FD" />
              <stop offset="1" stop-color="#FFFFFF" />
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
        v-if="signup.quickLeadVisible"
        class="newsletter__quick-lead"
      >
        Get the blog as a newsletter
      </p>
      <form v-if="signup.formVisible" class="newsletter__form" @submit.prevent="signup.subscribe()">
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
        <div
          v-if="signup.turnstileEnabled"
          ref="turnstileElement"
          class="newsletter__turnstile"
        ></div>
        <button type="submit" :disabled="signup.sending">
          <span class="newsletter__button-shine" aria-hidden="true"></span>
          <span class="newsletter__button-text">
            {{ signup.buttonLabel }}
            <svg v-if="!signup.sending" class="newsletter__plane" viewBox="0 0 24 24" aria-hidden="true">
              <!-- folded paper plane: three facets, opacity carries the 3D -->
              <path fill="currentColor" d="M22 3 3 10.5l7.5 1.7L22 3Z" />
              <path fill="currentColor" fill-opacity="0.72" d="M22 3 10.5 12.2l1.6 8.3L22 3Z" />
              <path fill="currentColor" fill-opacity="0.45" d="M10.5 12.2l1.6 8.3-2.6-5.4 1-2.9Z" />
            </svg>
          </span>
        </button>
      </form>
      <div v-if="signup.succeeded" class="newsletter__success" role="status">
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
        :class="{ error: signup.failed }"
      >
        {{ message }}
      </p>
    </div>
  </Transition>
  <Transition name="newsletter-slide">
    <button
      v-if="signup.pillVisible"
      type="button"
      class="newsletter-pill"
      aria-label="Open newsletter signup"
      @click="signup.openFromPill()"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm8 7.35L4.4 6h15.2L12 11.35ZM4 8.24V18h16V8.24l-7.45 5.3a1 1 0 0 1-1.1 0L4 8.24Z"/></svg>
      <span class="newsletter-pill__text">Newsletter</span>
    </button>
  </Transition>
</template>

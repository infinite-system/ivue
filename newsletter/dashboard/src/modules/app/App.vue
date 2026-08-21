<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterView } from 'vue-router';
import { AppStore } from './AppStore';
import SubscriberModal from '../subscriber/SubscriberModal.vue';

const app = AppStore.use();
const {
  // state refs
  checking,
  authenticated,
  secretDraft,
  loginError,
  toasts,
} = app;

onMounted(() => app.probe());
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <button class="brand" aria-label="Home" @click="app.open('subscribers')">
        <span class="brand-glyph" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <path
              d="M10.6 24 C 10.6 17.6, 19 17, 24 24 C 29 31, 37.4 30.4, 37.4 24 C 37.4 17.6, 29 17, 24 24 C 19 31, 10.6 30.4, 10.6 24 Z"
              stroke="#fff"
              stroke-width="3.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
        <span class="brand-mark">ivue</span>
      </button>
      <nav v-if="authenticated" class="tabs" aria-label="Domains">
        <button
          v-for="domain in app.DOMAINS"
          :key="domain.name"
          class="tab tab--domain"
          :class="{ active: app.isDomainOpen(domain.name) }"
          :data-domain="domain.name"
          @click="app.openDomain(domain.name)"
        >
          {{ domain.label }}
        </button>
      </nav>
      <button v-if="authenticated" class="ghost" @click="app.logout()">
        Lock
      </button>
    </header>

    <main v-if="checking" class="gate">
      <p class="muted">Checking session…</p>
    </main>

    <main v-else-if="!authenticated" class="gate">
      <form class="login card" @submit.prevent="app.login()">
        <span class="brand-glyph" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <path
              d="M10.6 24 C 10.6 17.6, 19 17, 24 24 C 29 31, 37.4 30.4, 37.4 24 C 37.4 17.6, 29 17, 24 24 C 19 31, 10.6 30.4, 10.6 24 Z"
              stroke="#fff"
              stroke-width="3.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
        <h1>Unlock the dashboard</h1>
        <p class="muted">
          Paste the admin secret. It stays in this tab's session storage —
          never in the page's code.
        </p>
        <label for="admin-secret">Admin secret</label>
        <input
          id="admin-secret"
          v-model="secretDraft"
          type="password"
          autocomplete="off"
          placeholder="ADMIN_SECRET"
        />
        <p v-if="loginError" class="error" role="alert">{{ loginError }}</p>
        <button class="primary" type="submit">Unlock</button>
      </form>
    </main>

    <main v-else class="content">
      <RouterView />
      <!-- any email address anywhere opens this — rides ?subscriber= -->
      <SubscriberModal />
    </main>

    <div class="toasts" aria-live="polite">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="toast.tone"
        @click="app.dismiss(toast.id)"
      >
        {{ toast.message }}
      </div>
    </div>
  </div>
</template>

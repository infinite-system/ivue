<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterView } from 'vue-router';
import { AppStore } from './AppStore';

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
      <div class="brand">
        <span class="brand-glyph" aria-hidden="true"></span>
        <span class="brand-mark">ivue</span>
        <span class="brand-sub">newsletter admin</span>
      </div>
      <nav v-if="authenticated" class="tabs" aria-label="Sections">
        <button
          v-for="tab in app.TABS"
          :key="tab.name"
          class="tab"
          :class="{ active: app.isOpen(tab.name) }"
          :data-tab="tab.name"
          @click="app.open(tab.name)"
        >
          {{ tab.label }}
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
        <span class="brand-glyph" aria-hidden="true"></span>
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

<script setup lang="ts">
import { onMounted } from 'vue';
import { AppModel } from './AppModel';
import SubscribersView from '../subscribers/SubscribersView.vue';
import SendsView from '../sends/SendsView.vue';
import PostsView from '../posts/PostsView.vue';
import SendView from '../send/SendView.vue';
import DripView from '../drip/DripView.vue';
import StatsView from '../stats/StatsView.vue';

const app = new AppModel.Class();
const {
  // state refs
  checking,
  authenticated,
  secretDraft,
  loginError,
  view,
  toasts,
} = app;

onMounted(() => app.probe());

const TABS = [
  { name: 'subscribers', label: 'Subscribers' },
  { name: 'sends', label: 'Sent' },
  { name: 'posts', label: 'Posts' },
  { name: 'send', label: 'Send' },
  { name: 'drip', label: 'Drip' },
  { name: 'stats', label: 'Stats' },
] as const;
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
          v-for="tab in TABS"
          :key="tab.name"
          class="tab"
          :class="{ active: view === tab.name }"
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
      <SubscribersView v-if="view === 'subscribers'" :app="app" />
      <SendsView v-else-if="view === 'sends'" :app="app" />
      <PostsView v-else-if="view === 'posts'" :app="app" />
      <SendView v-else-if="view === 'send'" :app="app" />
      <DripView v-else-if="view === 'drip'" :app="app" />
      <StatsView v-else :app="app" />
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

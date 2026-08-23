<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vitepress';
import { loadTurnstileScript } from '../turnstile';

// Blog comments — served by the newsletter Worker, moderated in its
// dashboard. Submissions land PENDING; nothing renders here until the
// operator approves it. Bodies render as plain text, never HTML.
const NEWSLETTER_ENDPOINT = 'https://ivue-newsletter.ekalashnikov.workers.dev';
const TURNSTILE_SITE_KEY = '0x4AAAAAAESFVS2C9LMeYZpt';

interface PublicComment {
  id: number;
  name: string;
  body: string;
  submittedAt: number;
}

const route = useRoute();
const isBlogPost = computed(
  () => /^\/blog\/.+/.test(route.path) && !route.path.endsWith('/blog/'),
);
const slug = computed(
  () => route.path.replace(/^\/blog\//, '').replace(/\.html$/, '').replace(/\/$/, ''),
);

const comments = ref<PublicComment[]>([]);
const loaded = ref(false);
const name = ref('');
const email = ref('');
const body = ref('');
const alsoSubscribe = ref(false);
const state = ref<'idle' | 'sending' | 'done' | 'error'>('idle');
const message = ref('');

async function loadComments() {
  if (!isBlogPost.value) return;
  try {
    const response = await fetch(
      `${NEWSLETTER_ENDPOINT}/comments?slug=${encodeURIComponent(slug.value)}`,
    );
    if (response.ok) comments.value = await response.json();
  } catch {
    /* comments are progressive enhancement — a failed load stays silent */
  } finally {
    loaded.value = true;
  }
}

onMounted(loadComments);
watch(slug, () => {
  comments.value = [];
  loaded.value = false;
  state.value = 'idle';
  loadComments();
});

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// --- Turnstile (explicit render, invisible unless challenged) --------
const turnstileElement = ref<HTMLElement | null>(null);
const turnstileToken = ref('');
let turnstileWidgetId: string | undefined;
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

async function submit() {
  if (!email.value || !body.value.trim() || state.value === 'sending') return;
  state.value = 'sending';
  try {
    const response = await fetch(`${NEWSLETTER_ENDPOINT}/comment`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        slug: slug.value,
        name: name.value,
        email: email.value,
        body: body.value,
        subscribe: alsoSubscribe.value,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
        ...(turnstileToken.value
          ? { turnstileToken: turnstileToken.value }
          : {}),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok) {
      state.value = 'done';
      body.value = '';
    } else {
      state.value = 'error';
      message.value =
        payload.error ?? 'Could not submit — try again in a minute.';
    }
  } catch {
    state.value = 'error';
    message.value = 'Could not submit — try again in a minute.';
  } finally {
    turnstileToken.value = '';
    if (turnstileWidgetId) (window as any).turnstile?.reset(turnstileWidgetId);
  }
}
</script>

<template>
  <section
    v-if="isBlogPost"
    class="blog-comments"
    aria-label="Comments"
  >
    <h2 class="blog-comments__title">
      Comments
      <span v-if="loaded" class="blog-comments__count">{{ comments.length }}</span>
    </h2>

    <ol v-if="comments.length" class="blog-comments__list">
      <li v-for="comment in comments" :key="comment.id" class="blog-comments__item">
        <div class="blog-comments__meta">
          <span class="blog-comments__name">{{ comment.name }}</span>
          <span class="blog-comments__date">{{ formatDate(comment.submittedAt) }}</span>
        </div>
        <!-- interpolation only: bodies are TEXT, never HTML -->
        <p class="blog-comments__body">{{ comment.body }}</p>
      </li>
    </ol>
    <p v-else-if="loaded" class="blog-comments__empty">
      No comments yet — start the conversation.
    </p>

    <form
      v-if="state !== 'done'"
      class="blog-comments__form"
      @submit.prevent="submit"
    >
      <div class="blog-comments__row">
        <input
          v-model="name"
          type="text"
          placeholder="Name"
          autocomplete="given-name"
          aria-label="Name"
          required
        />
        <input
          v-model="email"
          type="email"
          placeholder="Email (never shown)"
          autocomplete="email"
          aria-label="Email"
          required
        />
      </div>
      <textarea
        v-model="body"
        rows="4"
        maxlength="2000"
        placeholder="Your comment…"
        aria-label="Comment"
        required
      ></textarea>
      <label class="blog-comments__opt">
        <input v-model="alsoSubscribe" type="checkbox" />
        Also send me the blog as a newsletter
      </label>
      <div ref="turnstileElement" class="blog-comments__turnstile"></div>
      <div class="blog-comments__actions">
        <button type="submit" :disabled="state === 'sending'">
          {{ state === 'sending' ? 'Submitting…' : 'Submit comment' }}
        </button>
        <span v-if="state === 'error'" class="blog-comments__error" role="alert">
          {{ message }}
        </span>
      </div>
    </form>
    <p v-else class="blog-comments__done" role="status">
      ✓ Comment submitted — it appears once approved.
      <template v-if="alsoSubscribe"> Welcome to the newsletter.</template>
    </p>
  </section>
</template>

<style scoped>
.blog-comments {
  margin: 40px 0 8px;
  padding-top: 24px;
  border-top: 1px solid var(--vp-c-divider);
}
.blog-comments__title {
  margin: 0 0 14px;
  border: none;
  padding: 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.blog-comments__count {
  margin-left: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-soft);
  border-radius: 999px;
  padding: 2px 9px;
  vertical-align: 2px;
}
.blog-comments__list {
  list-style: none;
  margin: 0 0 20px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.blog-comments__item {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 12px 16px;
}
.blog-comments__meta {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 4px;
}
.blog-comments__name {
  font-weight: 600;
  font-size: 13.5px;
  color: var(--vp-c-text-1);
}
.blog-comments__date {
  font-size: 12px;
  color: var(--vp-c-text-3);
}
.blog-comments__body {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.blog-comments__empty {
  margin: 0 0 16px;
  font-size: 13.5px;
  color: var(--vp-c-text-3);
}
.blog-comments__form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.blog-comments__row {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 8px;
}
.blog-comments__form input,
.blog-comments__form textarea {
  padding: 8px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 9px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font: inherit;
  font-size: 13.5px;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}
.blog-comments__form input:focus,
.blog-comments__form textarea:focus {
  outline: none;
  border-color: #2dd4bf;
  box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.18);
}
.blog-comments__form textarea {
  resize: vertical;
}
.blog-comments__opt {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  color: var(--vp-c-text-3);
  cursor: pointer;
}
.blog-comments__opt input {
  accent-color: #2dd4bf;
}
.blog-comments__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.blog-comments__actions button {
  padding: 8px 18px;
  border: none;
  border-radius: 9px;
  background: linear-gradient(105deg, #6366f1, #2dd4bf 70%, #34d399);
  color: #f4f9ff;
  text-shadow: 0 1px 2px rgba(2, 6, 23, 0.45);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: filter 0.18s ease;
}
.blog-comments__actions button:hover {
  filter: brightness(1.12);
}
.blog-comments__actions button:disabled {
  opacity: 0.6;
  cursor: default;
}
.blog-comments__error {
  font-size: 12.5px;
  color: #f66;
}
.blog-comments__done {
  margin: 0;
  font-size: 13.5px;
  color: var(--vp-c-brand-1);
}
.blog-comments__turnstile:empty {
  display: none;
}
@media (max-width: 560px) {
  .blog-comments__row {
    grid-template-columns: 1fr;
  }
}
</style>

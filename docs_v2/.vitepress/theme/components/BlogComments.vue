<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vitepress';
import { loadTurnstileScript } from '../turnstile';
import CommentAvatar from './CommentAvatar.vue';

// Blog comments — served by the newsletter Worker, moderated in its
// dashboard. Submissions land PENDING; nothing renders here until the
// operator approves it. Bodies render as plain text, never HTML.
//
// Threads are TWO levels deep and no more: a top-level comment and its
// replies. Answering a reply stays at the same level and addresses it
// with an @mention, so a conversation never marches rightward off the
// screen. Replies fold: the newest one shows, the rest expand on ask.
const NEWSLETTER_ENDPOINT = 'https://ivue-newsletter.ekalashnikov.workers.dev';
const TURNSTILE_SITE_KEY = '0x4AAAAAAESFVS2C9LMeYZpt';
const IDENTITY_KEY = 'ivue-comment-identity';

interface PublicComment {
  id: number;
  name: string;
  body: string;
  submittedAt: number;
  parentId: number | null;
  rootId: number | null;
  locked: number;
  avatarSeed: string;
}

const route = useRoute();
const isBlogPost = computed(
  () => /^\/blog\/.+/.test(route.path) && !route.path.endsWith('/blog/'),
);
const slug = computed(() =>
  route.path.replace(/^\/blog\//, '').replace(/\.html$/, '').replace(/\/$/, ''),
);

const comments = ref<PublicComment[]>([]);
const loaded = ref(false);
const name = ref('');
const email = ref('');
const body = ref('');
const subscribeReplies = ref(true); // replies-to-me is the default
const alsoSubscribe = ref(false); // the newsletter is not
const state = ref<'idle' | 'sending' | 'done' | 'error'>('idle');
const message = ref('');
// which comment the open form answers (0 = a new top-level comment)
const replyTo = ref(0);
const submittedTo = ref(0);
const expandedRoots = ref<number[]>([]);
const bodyElement = ref<HTMLTextAreaElement | null>(null);

// ---- the tree ---------------------------------------------------------
const roots = computed(() =>
  comments.value.filter((comment) => !comment.parentId),
);
function repliesOf(rootId: number): PublicComment[] {
  return comments.value.filter(
    (comment) => comment.parentId && (comment.rootId ?? 0) === rootId,
  );
}
function latestReply(rootId: number): PublicComment | null {
  const replies = repliesOf(rootId);
  return replies.length ? replies[replies.length - 1] : null;
}
function hiddenReplyCount(rootId: number): number {
  return Math.max(0, repliesOf(rootId).length - 1);
}
function isExpanded(rootId: number): boolean {
  return expandedRoots.value.includes(rootId);
}
function expand(rootId: number) {
  if (!isExpanded(rootId)) expandedRoots.value = [...expandedRoots.value, rootId];
}
function collapse(rootId: number) {
  expandedRoots.value = expandedRoots.value.filter((id) => id !== rootId);
}
// a locked thread carries the flag on its root row
function threadLocked(rootId: number): boolean {
  const root = comments.value.find((comment) => comment.id === rootId);
  return Boolean(root?.locked);
}
// everyone in a thread, for the @mention chips (the author of the
// comment being answered is already addressed by the reply itself)
function participants(rootId: number, excludeId: number): string[] {
  const seen = new Set<string>();
  for (const comment of comments.value) {
    if (comment.id !== rootId && (comment.rootId ?? 0) !== rootId) continue;
    if (comment.id === excludeId) continue;
    if (comment.name.trim()) seen.add(comment.name.trim());
  }
  return [...seen].slice(0, 8);
}
const totalCount = computed(() => comments.value.length);

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
    await nextTick();
    revealDeepLink();
  }
}

// arriving at #comment-123: expand the thread that holds it, then land
const highlighted = ref(0);
function revealDeepLink() {
  const match = /^#comment-(\d+)$/.exec(window.location.hash);
  if (!match) return;
  const id = Number(match[1]);
  const target = comments.value.find((comment) => comment.id === id);
  if (!target) return;
  highlighted.value = id;
  expand(target.rootId ?? target.id);
  nextTick(() => {
    document
      .getElementById(`comment-${id}`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
}

// ---- following a thread (arrival from a notification email) ----------
const followedThread = ref(0);
const followEmail = ref('');
const followToken = ref('');
const following = ref(false);
const followState = ref<'idle' | 'leaving' | 'left'>('idle');

async function readFollowState() {
  const query = new URLSearchParams(window.location.search);
  const thread = Number(query.get('thread') ?? 0);
  const address = (query.get('sub') ?? '').trim();
  const token = (query.get('t') ?? '').trim();
  if (!thread || !address || !token) return;
  followedThread.value = thread;
  followEmail.value = address;
  followToken.value = token;
  try {
    const response = await fetch(
      `${NEWSLETTER_ENDPOINT}/comment-subscription?thread=${thread}` +
        `&email=${encodeURIComponent(address)}&token=${encodeURIComponent(token)}`,
    );
    if (!response.ok) return;
    const payload = await response.json();
    following.value = Boolean(payload.following);
    if (!following.value) followState.value = 'left';
    expand(thread);
  } catch {
    /* the Worker page in the email is the fallback for this */
  }
}

async function stopFollowing() {
  if (followState.value === 'leaving') return;
  followState.value = 'leaving';
  try {
    const response = await fetch(`${NEWSLETTER_ENDPOINT}/comment-unsubscribe`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        thread: followedThread.value,
        email: followEmail.value,
        token: followToken.value,
      }),
    });
    if (response.ok) {
      following.value = false;
      followState.value = 'left';
    } else {
      followState.value = 'idle';
    }
  } catch {
    followState.value = 'idle';
  }
}

onMounted(() => {
  restoreIdentity();
  loadComments();
  readFollowState();
});

watch(slug, () => {
  comments.value = [];
  loaded.value = false;
  state.value = 'idle';
  replyTo.value = 0;
  submittedTo.value = 0;
  expandedRoots.value = [];
  highlighted.value = 0;
  loadComments();
});

// name/email survive between comments — a returning reader retypes nothing
function restoreIdentity() {
  try {
    const stored = JSON.parse(localStorage.getItem(IDENTITY_KEY) ?? '{}');
    if (typeof stored.name === 'string') name.value = stored.name;
    if (typeof stored.email === 'string') email.value = stored.email;
  } catch {
    /* private mode, cleared storage — the form just starts empty */
  }
}
function rememberIdentity() {
  try {
    localStorage.setItem(
      IDENTITY_KEY,
      JSON.stringify({ name: name.value, email: email.value }),
    );
  } catch {
    /* storage is a convenience, never a requirement */
  }
}

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ---- the form ---------------------------------------------------------
function openReply(comment: PublicComment) {
  const rootId = comment.rootId ?? comment.id;
  if (threadLocked(rootId)) return;
  replyTo.value = comment.id;
  submittedTo.value = 0;
  state.value = 'idle';
  expand(rootId);
  // answering a REPLY addresses it by name — the level stays the same
  if (comment.parentId && !body.value.includes(`@${comment.name}`))
    body.value = `@${comment.name} ${body.value}`.trimStart();
  nextTick(() => bodyElement.value?.focus());
}

function cancelReply() {
  replyTo.value = 0;
  body.value = '';
  state.value = 'idle';
}

function mention(who: string) {
  if (body.value.includes(`@${who}`)) return;
  body.value = `${body.value.trimEnd()} @${who} `.trimStart();
  bodyElement.value?.focus();
}

// is the open form attached to this comment?
function formIsOn(commentId: number): boolean {
  return replyTo.value === commentId && state.value !== 'done';
}
function doneOn(commentId: number): boolean {
  return submittedTo.value === commentId && state.value === 'done';
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
  if (!element) return;
  // the top-level form and the inline reply form are DIFFERENT
  // elements — swapping forms must tear down the old widget or the
  // new form never gets one (and submits token-less, which the
  // Worker refuses)
  if (turnstileWidgetId) {
    (window as any).turnstile?.remove?.(turnstileWidgetId);
    turnstileWidgetId = undefined;
    turnstileToken.value = '';
  }
  renderTurnstile();
});

// render on demand and WAIT for the async token — never race it
async function awaitTurnstileToken(): Promise<string> {
  if (!TURNSTILE_SITE_KEY) return '';
  await renderTurnstile();
  const deadline = Date.now() + 8000;
  while (!turnstileToken.value && Date.now() < deadline)
    await new Promise((resolve) => setTimeout(resolve, 150));
  return turnstileToken.value;
}

async function submit() {
  if (!email.value || !body.value.trim() || state.value === 'sending') return;
  state.value = 'sending';
  const target = replyTo.value;
  await awaitTurnstileToken();
  try {
    const response = await fetch(`${NEWSLETTER_ENDPOINT}/comment`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        slug: slug.value,
        name: name.value,
        email: email.value,
        body: body.value,
        parentId: target || null,
        subscribeReplies: subscribeReplies.value,
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
      submittedTo.value = target;
      body.value = '';
      rememberIdentity();
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
  <section v-if="isBlogPost" class="blog-comments" aria-label="Comments">
    <h2 class="blog-comments__title">
      Comments
      <span v-if="loaded" class="blog-comments__count">{{ totalCount }}</span>
    </h2>

    <!-- arrived from a reply notification: say so, and offer one click out -->
    <p
      v-if="followedThread && following"
      class="blog-comments__follow"
      role="status"
    >
      <span
        >You follow replies on this thread as
        <strong>{{ followEmail }}</strong
        >.</span
      >
      <button type="button" @click="stopFollowing()">
        {{ followState === 'leaving' ? 'Stopping…' : 'Stop following' }}
      </button>
    </p>
    <p
      v-else-if="followedThread && followState === 'left'"
      class="blog-comments__follow blog-comments__follow--left"
      role="status"
    >
      You no longer follow replies on this thread.
    </p>

    <ol v-if="roots.length" class="blog-comments__list">
      <li
        v-for="root in roots"
        :key="root.id"
        :id="`comment-${root.id}`"
        class="blog-comments__item"
        :class="{ 'is-highlighted': highlighted === root.id }"
      >
        <div class="blog-comments__head">
          <CommentAvatar :seed="root.avatarSeed" :name="root.name" />
          <div class="blog-comments__meta">
            <span class="blog-comments__name">{{ root.name }}</span>
            <span class="blog-comments__date">{{
              formatDate(root.submittedAt)
            }}</span>
          </div>
          <span v-if="root.locked" class="blog-comments__lock" title="Replies locked"
            >🔒 locked</span
          >
        </div>
        <!-- interpolation only: bodies are TEXT, never HTML -->
        <p class="blog-comments__body">{{ root.body }}</p>

        <div class="blog-comments__actions-row">
          <button
            v-if="!root.locked"
            type="button"
            class="blog-comments__reply-link"
            @click="openReply(root)"
          >
            Reply
          </button>
          <span v-else class="blog-comments__locked-note">
            Replies are locked on this thread.
          </span>
        </div>

        <!-- replies: the newest shows; the rest expand on ask -->
        <ol
          v-if="repliesOf(root.id).length"
          class="blog-comments__replies"
        >
          <template v-if="isExpanded(root.id)">
            <li
              v-for="reply in repliesOf(root.id)"
              :key="reply.id"
              :id="`comment-${reply.id}`"
              class="blog-comments__reply"
              :class="{ 'is-highlighted': highlighted === reply.id }"
            >
              <div class="blog-comments__head">
                <CommentAvatar
                  :seed="reply.avatarSeed"
                  :name="reply.name"
                  :size="26"
                />
                <div class="blog-comments__meta">
                  <span class="blog-comments__name">{{ reply.name }}</span>
                  <span class="blog-comments__date">{{
                    formatDate(reply.submittedAt)
                  }}</span>
                </div>
              </div>
              <p class="blog-comments__body">{{ reply.body }}</p>
              <div class="blog-comments__actions-row">
                <button
                  v-if="!root.locked"
                  type="button"
                  class="blog-comments__reply-link"
                  @click="openReply(reply)"
                >
                  Reply
                </button>
              </div>
            </li>
          </template>
          <li v-else class="blog-comments__reply" :key="`latest-${root.id}`">
            <div class="blog-comments__head">
              <CommentAvatar
                :seed="latestReply(root.id)!.avatarSeed"
                :name="latestReply(root.id)!.name"
                :size="26"
              />
              <div class="blog-comments__meta">
                <span class="blog-comments__name">{{
                  latestReply(root.id)!.name
                }}</span>
                <span class="blog-comments__date">{{
                  formatDate(latestReply(root.id)!.submittedAt)
                }}</span>
                <span class="blog-comments__latest">latest reply</span>
              </div>
            </div>
            <p class="blog-comments__body">{{ latestReply(root.id)!.body }}</p>
            <div class="blog-comments__actions-row">
              <button
                v-if="!root.locked"
                type="button"
                class="blog-comments__reply-link"
                @click="openReply(latestReply(root.id)!)"
              >
                Reply
              </button>
            </div>
          </li>
        </ol>

        <button
          v-if="hiddenReplyCount(root.id) && !isExpanded(root.id)"
          type="button"
          class="blog-comments__more"
          @click="expand(root.id)"
        >
          Show {{ hiddenReplyCount(root.id) }} earlier
          {{ hiddenReplyCount(root.id) === 1 ? 'reply' : 'replies' }}
        </button>
        <button
          v-else-if="repliesOf(root.id).length > 1 && isExpanded(root.id)"
          type="button"
          class="blog-comments__more"
          @click="collapse(root.id)"
        >
          Fold replies
        </button>

        <!-- the inline reply form lives inside the thread it answers -->
        <form
          v-if="
            formIsOn(root.id) ||
            repliesOf(root.id).some((reply) => formIsOn(reply.id))
          "
          class="blog-comments__form blog-comments__form--reply"
          @submit.prevent="submit"
        >
          <p class="blog-comments__answering">
            Replying to
            <strong>{{
              comments.find((comment) => comment.id === replyTo)?.name
            }}</strong>
            <button type="button" @click="cancelReply()">cancel</button>
          </p>
          <div class="blog-comments__row">
            <input
              v-model="name"
              type="text"
              placeholder="Name"
              autocomplete="name"
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
            ref="bodyElement"
            v-model="body"
            rows="3"
            maxlength="2000"
            placeholder="Your reply…"
            aria-label="Reply"
            required
          ></textarea>
          <p
            v-if="participants(root.id, replyTo).length"
            class="blog-comments__mentions"
          >
            <span>Mention:</span>
            <button
              v-for="who in participants(root.id, replyTo)"
              :key="who"
              type="button"
              @click="mention(who)"
            >
              @{{ who }}
            </button>
          </p>
          <label class="blog-comments__opt">
            <input v-model="subscribeReplies" type="checkbox" />
            Email me replies to this thread
          </label>
          <label class="blog-comments__opt">
            <input v-model="alsoSubscribe" type="checkbox" />
            Also send me the blog as a newsletter
          </label>
          <div ref="turnstileElement" class="blog-comments__turnstile"></div>
          <div class="blog-comments__actions">
            <button type="submit" :disabled="state === 'sending'">
              {{ state === 'sending' ? 'Submitting…' : 'Post reply' }}
            </button>
            <span
              v-if="state === 'error'"
              class="blog-comments__error"
              role="alert"
              >{{ message }}</span
            >
          </div>
        </form>
        <p
          v-else-if="
            doneOn(root.id) ||
            repliesOf(root.id).some((reply) => doneOn(reply.id))
          "
          class="blog-comments__done"
          role="status"
        >
          ✓ Reply submitted — it appears once approved.
        </p>
      </li>
    </ol>
    <p v-else-if="loaded" class="blog-comments__empty">
      No comments yet — start the conversation.
    </p>

    <!-- a new top-level comment -->
    <form
      v-if="replyTo === 0 && state !== 'done'"
      class="blog-comments__form"
      @submit.prevent="submit"
    >
      <div class="blog-comments__row">
        <input
          v-model="name"
          type="text"
          placeholder="Name"
          autocomplete="name"
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
        ref="bodyElement"
        v-model="body"
        rows="4"
        maxlength="2000"
        placeholder="Your comment…"
        aria-label="Comment"
        required
      ></textarea>
      <label class="blog-comments__opt">
        <input v-model="subscribeReplies" type="checkbox" />
        Email me replies to this thread
      </label>
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
    <p
      v-else-if="replyTo === 0 && state === 'done'"
      class="blog-comments__done"
      role="status"
    >
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
.blog-comments__follow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 0 0 16px;
  padding: 9px 14px;
  border: 1px solid var(--ivue-hairline);
  border-radius: 10px;
  background: color-mix(in srgb, var(--ivue-link-accent) 7%, transparent);
  font-size: 13px;
  color: var(--vp-c-text-2);
}
.blog-comments__follow strong {
  color: var(--vp-c-text-1);
}
.blog-comments__follow button {
  padding: 4px 12px;
  border: 1px solid var(--ivue-link-2);
  border-radius: 999px;
  background: transparent;
  color: var(--ivue-link-2);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.blog-comments__follow--left {
  color: var(--vp-c-text-3);
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
.blog-comments__item.is-highlighted,
.blog-comments__reply.is-highlighted {
  border-color: var(--ivue-link-2);
  background: color-mix(in srgb, var(--ivue-link-accent) 8%, transparent);
}
.blog-comments__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.blog-comments__meta {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
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
.blog-comments__latest {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}
.blog-comments__lock {
  margin-left: auto;
  font-size: 11.5px;
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
.blog-comments__actions-row {
  margin-top: 6px;
}
.blog-comments__reply-link {
  padding: 0;
  border: none;
  background: none;
  color: var(--ivue-link-2);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
.blog-comments__locked-note {
  font-size: 12px;
  color: var(--vp-c-text-3);
}
.blog-comments__replies {
  list-style: none;
  margin: 10px 0 0;
  padding: 0 0 0 14px;
  border-left: 2px solid var(--ivue-hairline);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.blog-comments__reply {
  padding: 8px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 9px;
  background: var(--vp-c-bg);
}
.blog-comments__more {
  margin-top: 8px;
  padding: 4px 12px;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 999px;
  background: none;
  color: var(--vp-c-text-2);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.blog-comments__more:hover {
  color: var(--ivue-link-2);
  border-color: var(--ivue-link-2);
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
.blog-comments__form--reply {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg);
}
.blog-comments__answering {
  margin: 0;
  font-size: 12.5px;
  color: var(--vp-c-text-3);
}
.blog-comments__answering strong {
  color: var(--vp-c-text-1);
}
.blog-comments__answering button {
  margin-left: 8px;
  padding: 0;
  border: none;
  background: none;
  color: var(--ivue-link-2);
  font-size: 12px;
  cursor: pointer;
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
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
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
.blog-comments__mentions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 12px;
  color: var(--vp-c-text-3);
}
.blog-comments__mentions button {
  padding: 2px 9px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  background: none;
  color: var(--ivue-link-2);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
}
.blog-comments__mentions button:hover {
  border-color: var(--ivue-link-2);
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
  margin: 8px 0 0;
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
  .blog-comments__replies {
    padding-left: 10px;
  }
}
</style>

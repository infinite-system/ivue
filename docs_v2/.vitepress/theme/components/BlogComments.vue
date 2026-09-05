<script setup lang="ts">
import { BlogComments } from './BlogComments';
import CommentAvatar from './CommentAvatar.vue';

// Blog comments — the model (BlogComments.ts) owns the thread tree, the
// form, the follow banner, and the Turnstile handshake; this file is
// wiring and markup. Design + invariants: newsletter/COMMENTS.md.
const discussion = new BlogComments.Class();

// the state destructure — every Ref the template touches, grouped
const {
  // state refs
  loaded,
  name,
  email,
  body,
  subscribeReplies,
  alsoSubscribe,
  message,
  followEmail,
  // element refs
  bodyElement,
  turnstileElement,
} = discussion;
</script>

<template>
  <section v-if="discussion.isBlogPost" class="blog-comments" aria-label="Comments">
    <h2 class="blog-comments__title">
      Comments
      <span v-if="loaded" class="blog-comments__count">{{ discussion.totalCount }}</span>
    </h2>

    <!-- arrived from a reply notification: say so, and offer one click out -->
    <p
      v-if="discussion.isFollowing"
      class="blog-comments__follow"
      role="status"
    >
      <span
        >You follow replies on this thread as
        <strong>{{ followEmail }}</strong
        >.</span
      >
      <button type="button" @click="discussion.stopFollowing()">
        {{ discussion.stopFollowingLabel }}
      </button>
    </p>
    <p
      v-else-if="discussion.hasStoppedFollowing"
      class="blog-comments__follow blog-comments__follow--left"
      role="status"
    >
      You no longer follow replies on this thread.
    </p>

    <ol v-if="discussion.hasRoots" class="blog-comments__list">
      <li
        v-for="root in discussion.roots"
        :key="root.id"
        :id="discussion.commentAnchor(root.id)"
        class="blog-comments__item"
        :class="{ 'is-highlighted': discussion.isHighlighted(root.id) }"
      >
        <div class="blog-comments__head">
          <CommentAvatar :seed="root.avatarSeed" :name="root.name" />
          <div class="blog-comments__meta">
            <span class="blog-comments__name">{{ root.name }}</span>
            <span class="blog-comments__date">{{
              discussion.formatDate(root.submittedAt)
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
            @click="discussion.openReply(root)"
          >
            Reply
          </button>
          <span v-else class="blog-comments__locked-note">
            Replies are locked on this thread.
          </span>
        </div>

        <!-- replies: the newest shows; the rest expand on ask -->
        <ol v-if="discussion.hasReplies(root.id)" class="blog-comments__replies">
          <template v-if="discussion.isExpanded(root.id)">
            <li
              v-for="reply in discussion.repliesOf(root.id)"
              :key="reply.id"
              :id="discussion.commentAnchor(reply.id)"
              class="blog-comments__reply"
              :class="{ 'is-highlighted': discussion.isHighlighted(reply.id) }"
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
                    discussion.formatDate(reply.submittedAt)
                  }}</span>
                </div>
              </div>
              <p class="blog-comments__body">{{ reply.body }}</p>
              <div class="blog-comments__actions-row">
                <button
                  v-if="!root.locked"
                  type="button"
                  class="blog-comments__reply-link"
                  @click="discussion.openReply(reply)"
                >
                  Reply
                </button>
              </div>
            </li>
          </template>
          <li v-else class="blog-comments__reply" :key="discussion.latestKey(root.id)">
            <div class="blog-comments__head">
              <CommentAvatar
                :seed="discussion.latestReply(root.id)!.avatarSeed"
                :name="discussion.latestReply(root.id)!.name"
                :size="26"
              />
              <div class="blog-comments__meta">
                <span class="blog-comments__name">{{
                  discussion.latestReply(root.id)!.name
                }}</span>
                <span class="blog-comments__date">{{
                  discussion.formatDate(discussion.latestReply(root.id)!.submittedAt)
                }}</span>
                <span class="blog-comments__latest">latest reply</span>
              </div>
            </div>
            <p class="blog-comments__body">{{ discussion.latestReply(root.id)!.body }}</p>
            <div class="blog-comments__actions-row">
              <button
                v-if="!root.locked"
                type="button"
                class="blog-comments__reply-link"
                @click="discussion.openReply(discussion.latestReply(root.id)!)"
              >
                Reply
              </button>
            </div>
          </li>
        </ol>

        <button
          v-if="discussion.showsMoreButton(root.id)"
          type="button"
          class="blog-comments__more"
          @click="discussion.expand(root.id)"
        >
          {{ discussion.moreLabel(root.id) }}
        </button>
        <button
          v-else-if="discussion.showsFoldButton(root.id)"
          type="button"
          class="blog-comments__more"
          @click="discussion.collapse(root.id)"
        >
          Fold replies
        </button>

        <!-- the inline reply form lives inside the thread it answers -->
        <form
          v-if="discussion.formIsInThread(root.id)"
          class="blog-comments__form blog-comments__form--reply"
          @submit.prevent="discussion.submit()"
        >
          <p class="blog-comments__answering">
            Replying to
            <strong>{{ discussion.replyingToName }}</strong>
            <button type="button" @click="discussion.cancelReply()">cancel</button>
          </p>
          <div class="blog-comments__row">
            <input
              v-model="name"
              type="text"
              placeholder="Name"
              autocomplete="name"
              aria-label="Name"
              required
              @focus.once="discussion.ensureTurnstile()"
            />
            <input
              v-model="email"
              type="email"
              placeholder="Email (never shown)"
              autocomplete="email"
              aria-label="Email"
              required
              @focus.once="discussion.ensureTurnstile()"
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
            @focus.once="discussion.ensureTurnstile()"
          ></textarea>
          <p v-if="discussion.hasMentionable(root.id)" class="blog-comments__mentions">
            <span>Mention:</span>
            <button
              v-for="who in discussion.mentionable(root.id)"
              :key="who"
              type="button"
              @click="discussion.mention(who)"
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
            <button type="submit" :disabled="discussion.isSending">
              {{ discussion.replySubmitLabel }}
            </button>
            <span v-if="discussion.hasError" class="blog-comments__error" role="alert">{{
              message
            }}</span>
          </div>
        </form>
        <p v-else-if="discussion.doneInThread(root.id)" class="blog-comments__done" role="status">
          ✓ Reply submitted — it appears once approved.
        </p>
      </li>
    </ol>
    <p v-else-if="loaded" class="blog-comments__empty">
      No comments yet — start the conversation.
    </p>

    <!-- a new top-level comment -->
    <form v-if="discussion.showsNewForm" class="blog-comments__form" @submit.prevent="discussion.submit()">
      <div class="blog-comments__row">
        <input
          v-model="name"
          type="text"
          placeholder="Name"
          autocomplete="name"
          aria-label="Name"
          required
          @focus.once="discussion.ensureTurnstile()"
        />
        <input
          v-model="email"
          type="email"
          placeholder="Email (never shown)"
          autocomplete="email"
          aria-label="Email"
          required
          @focus.once="discussion.ensureTurnstile()"
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
        @focus.once="discussion.ensureTurnstile()"
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
        <button type="submit" :disabled="discussion.isSending">
          {{ discussion.submitLabel }}
        </button>
        <span v-if="discussion.hasError" class="blog-comments__error" role="alert">
          {{ message }}
        </span>
      </div>
    </form>
    <p v-else-if="discussion.showsNewDone" class="blog-comments__done" role="status">
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

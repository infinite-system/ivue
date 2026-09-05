import { nextTick, onMounted, ref, shallowRef, watch } from 'vue';
import { useRoute } from 'vitepress';
import { Reactive } from '../../../../lib/Reactive';
import { Static } from '../../../../lib/Static';
import { loadTurnstileScript } from '../turnstile';

// Blog comments — served by the newsletter Worker, moderated in its
// dashboard (design + invariants: newsletter/COMMENTS.md). Submissions
// land PENDING; nothing renders here until the operator approves it.
// Bodies render as plain text, never HTML.
//
// Threads are TWO levels deep and no more: a top-level comment and its
// replies. Answering a reply stays at the same level and addresses it
// with an @mention, so a conversation never marches rightward off the
// screen. Replies fold: the newest one shows, the rest expand on ask.
class $BlogComments {
  /** The newsletter Worker's public URL (see /newsletter/README.md). */
  static get ENDPOINT() {
    return 'https://ivue-newsletter.ekalashnikov.workers.dev';
  }

  /** Turnstile sitekey — empty string skips the widget. */
  static get TURNSTILE_SITE_KEY() {
    return '0x4AAAAAAESFVS2C9LMeYZpt';
  }

  /** localStorage key under which name/email survive between comments. */
  static get IDENTITY_KEY() {
    return 'ivue-comment-identity';
  }

  /** How long a submit waits for a Turnstile token: when Cloudflare
   *  decides the widget needs INTERACTION, a human needs time to click. */
  static get TURNSTILE_TOKEN_DEADLINE_MS() {
    return 45_000;
  }

  constructor() {
    this.route = useRoute();
    onMounted(() => this.onMount());
    watch(
      () => this.slug,
      () => this.resetForSlug(),
    );
    // the top-level form and the inline reply form are DIFFERENT
    // elements — swapping forms must tear down the old widget
    watch(
      () => this.turnstileElement.value,
      (element) => this.onTurnstileElement(element),
    );
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $BlogComments;
  }

  protected readonly route: ReturnType<typeof useRoute>;

  // MUTABLE STATE — the thread list (replaced wholesale on every load)
  get comments() {
    return shallowRef<BlogComments.PublicComment[]>([]);
  }

  get loaded() {
    return ref(false);
  }

  // MUTABLE STATE — the form
  get name() {
    return ref('');
  }

  get email() {
    return ref('');
  }

  get body() {
    return ref('');
  }

  /** replies-to-me is the default */
  get subscribeReplies() {
    return ref(true);
  }

  /** the newsletter is not */
  get alsoSubscribe() {
    return ref(false);
  }

  get state() {
    return ref<BlogComments.SubmitState>('idle');
  }

  get message() {
    return ref('');
  }

  /** which comment the open form answers (0 = a new top-level comment) */
  get replyTo() {
    return ref(0);
  }

  get submittedTo() {
    return ref(0);
  }

  get expandedRoots() {
    return shallowRef<number[]>([]);
  }

  /** arriving at #comment-123 lands on and highlights that comment */
  get highlighted() {
    return ref(0);
  }

  // MUTABLE STATE — following a thread (arrival from a notification email)
  get followedThread() {
    return ref(0);
  }

  get followEmail() {
    return ref('');
  }

  get followToken() {
    return ref('');
  }

  get following() {
    return ref(false);
  }

  get followState() {
    return ref<BlogComments.FollowState>('idle');
  }

  // MUTABLE STATE — Turnstile (explicit render, invisible unless challenged)
  get turnstileToken() {
    return ref('');
  }

  /** Turnstile's widget handle — bookkeeping, never read by the template. */
  get turnstileWidgetId() {
    return shallowRef<string | undefined>(undefined);
  }

  // TEMPLATE-REF TARGETS
  get bodyElement() {
    return ref<HTMLTextAreaElement | null>(null);
  }

  get turnstileElement() {
    return ref<HTMLElement | null>(null);
  }

  // DERIVED — the page
  get isBlogPost() {
    const path = this.route.path;
    return /^\/blog\/.+/.test(path) && !path.endsWith('/blog/');
  }

  get slug() {
    return this.route.path
      .replace(/^\/blog\//, '')
      .replace(/\.html$/, '')
      .replace(/\/$/, '');
  }

  // DERIVED — the tree
  get roots() {
    return this.comments.value.filter((comment) => !comment.parentId);
  }

  get hasRoots() {
    return this.roots.length > 0;
  }

  get totalCount() {
    return this.comments.value.length;
  }

  /** The name of the comment the open form answers. */
  get replyingToName() {
    const target = this.replyTo.value;
    return this.comments.value.find((comment) => comment.id === target)?.name ?? '';
  }

  // DERIVED — the follow banner
  get isFollowing() {
    return this.followedThread.value !== 0 && this.following.value;
  }

  get hasStoppedFollowing() {
    return this.followedThread.value !== 0 && this.followState.value === 'left';
  }

  get stopFollowingLabel() {
    return this.followState.value === 'leaving' ? 'Stopping…' : 'Stop following';
  }

  // DERIVED — the form
  get isSending() {
    return this.state.value === 'sending';
  }

  get hasError() {
    return this.state.value === 'error';
  }

  get submitLabel() {
    return this.isSending ? 'Submitting…' : 'Submit comment';
  }

  get replySubmitLabel() {
    return this.isSending ? 'Submitting…' : 'Post reply';
  }

  /** The top-level form shows while no reply is open and nothing was just sent. */
  get showsNewForm() {
    return this.replyTo.value === 0 && this.state.value !== 'done';
  }

  get showsNewDone() {
    return this.replyTo.value === 0 && this.state.value === 'done';
  }

  // PER-THREAD READS — one name per template condition
  repliesOf(rootId: number): BlogComments.PublicComment[] {
    return this.comments.value.filter(
      (comment) => comment.parentId && (comment.rootId ?? 0) === rootId,
    );
  }

  hasReplies(rootId: number) {
    return this.repliesOf(rootId).length > 0;
  }

  latestReply(rootId: number): BlogComments.PublicComment | null {
    const replies = this.repliesOf(rootId);
    return replies.length ? replies[replies.length - 1] : null;
  }

  hiddenReplyCount(rootId: number) {
    return Math.max(0, this.repliesOf(rootId).length - 1);
  }

  isExpanded(rootId: number) {
    return this.expandedRoots.value.includes(rootId);
  }

  /** Earlier replies exist and are folded. */
  showsMoreButton(rootId: number) {
    return this.hiddenReplyCount(rootId) > 0 && !this.isExpanded(rootId);
  }

  moreLabel(rootId: number) {
    const count = this.hiddenReplyCount(rootId);
    return `Show ${count} earlier ${count === 1 ? 'reply' : 'replies'}`;
  }

  /** The thread is unfolded and has more than the latest reply to fold. */
  showsFoldButton(rootId: number) {
    return this.repliesOf(rootId).length > 1 && this.isExpanded(rootId);
  }

  /** a locked thread carries the flag on its root row */
  threadLocked(rootId: number) {
    const root = this.comments.value.find((comment) => comment.id === rootId);
    return Boolean(root?.locked);
  }

  /** everyone in a thread, for the @mention chips (the author of the
   *  comment being answered is already addressed by the reply itself) */
  participants(rootId: number, excludeId: number): string[] {
    const seen = new Set<string>();
    for (const comment of this.comments.value) {
      if (comment.id !== rootId && (comment.rootId ?? 0) !== rootId) continue;
      if (comment.id === excludeId) continue;
      if (comment.name.trim()) seen.add(comment.name.trim());
    }
    return [...seen].slice(0, 8);
  }

  /** The mention chips for the open reply form inside this thread. */
  mentionable(rootId: number) {
    return this.participants(rootId, this.replyTo.value);
  }

  hasMentionable(rootId: number) {
    return this.mentionable(rootId).length > 0;
  }

  commentAnchor(commentId: number) {
    return `comment-${commentId}`;
  }

  latestKey(rootId: number) {
    return `latest-${rootId}`;
  }

  isHighlighted(commentId: number) {
    return this.highlighted.value === commentId;
  }

  /** is the open form attached to this comment? */
  formIsOn(commentId: number) {
    return this.replyTo.value === commentId && this.state.value !== 'done';
  }

  doneOn(commentId: number) {
    return this.submittedTo.value === commentId && this.state.value === 'done';
  }

  /** The inline reply form lives inside the thread it answers — on the
   *  root or on any of its replies. */
  formIsInThread(rootId: number) {
    return (
      this.formIsOn(rootId) ||
      this.repliesOf(rootId).some((reply) => this.formIsOn(reply.id))
    );
  }

  doneInThread(rootId: number) {
    return (
      this.doneOn(rootId) ||
      this.repliesOf(rootId).some((reply) => this.doneOn(reply.id))
    );
  }

  formatDate(unixSeconds: number) {
    return new Date(unixSeconds * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  // ACTIONS — the tree
  expand(rootId: number) {
    if (!this.isExpanded(rootId))
      this.expandedRoots.value = [...this.expandedRoots.value, rootId];
  }

  collapse(rootId: number) {
    this.expandedRoots.value = this.expandedRoots.value.filter((id) => id !== rootId);
  }

  // ACTIONS — lifecycle
  onMount() {
    this.restoreIdentity();
    this.loadComments();
    this.readFollowState();
  }

  /** A route change under the same component: start the page over. */
  resetForSlug() {
    this.comments.value = [];
    this.loaded.value = false;
    this.state.value = 'idle';
    this.replyTo.value = 0;
    this.submittedTo.value = 0;
    this.expandedRoots.value = [];
    this.highlighted.value = 0;
    this.loadComments();
  }

  async loadComments() {
    if (!this.isBlogPost) return;
    try {
      const response = await fetch(
        `${this.self.ENDPOINT}/comments?slug=${encodeURIComponent(this.slug)}`,
      );
      if (response.ok) this.comments.value = await response.json();
    } catch {
      /* comments are progressive enhancement — a failed load stays silent */
    } finally {
      this.loaded.value = true;
      await nextTick();
      this.revealDeepLink();
    }
  }

  /** arriving at #comment-123: expand the thread that holds it, then land */
  revealDeepLink() {
    const match = /^#comment-(\d+)$/.exec(window.location.hash);
    if (!match) return;
    const id = Number(match[1]);
    const target = this.comments.value.find((comment) => comment.id === id);
    if (!target) return;
    this.highlighted.value = id;
    this.expand(target.rootId ?? target.id);
    nextTick(() => this.scrollToComment(id));
  }

  scrollToComment(commentId: number) {
    document
      .getElementById(this.commentAnchor(commentId))
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  // ACTIONS — following a thread
  async readFollowState() {
    const query = new URLSearchParams(window.location.search);
    const thread = Number(query.get('thread') ?? 0);
    const address = (query.get('sub') ?? '').trim();
    const token = (query.get('t') ?? '').trim();
    if (!thread || !address || !token) return;
    this.followedThread.value = thread;
    this.followEmail.value = address;
    this.followToken.value = token;
    try {
      const response = await fetch(
        `${this.self.ENDPOINT}/comment-subscription?thread=${thread}` +
          `&email=${encodeURIComponent(address)}&token=${encodeURIComponent(token)}`,
      );
      if (!response.ok) return;
      const payload = await response.json();
      this.following.value = Boolean(payload.following);
      if (!this.following.value) this.followState.value = 'left';
      this.expand(thread);
    } catch {
      /* the Worker page in the email is the fallback for this */
    }
  }

  async stopFollowing() {
    if (this.followState.value === 'leaving') return;
    this.followState.value = 'leaving';
    try {
      const response = await fetch(`${this.self.ENDPOINT}/comment-unsubscribe`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          thread: this.followedThread.value,
          email: this.followEmail.value,
          token: this.followToken.value,
        }),
      });
      if (response.ok) {
        this.following.value = false;
        this.followState.value = 'left';
      } else {
        this.followState.value = 'idle';
      }
    } catch {
      this.followState.value = 'idle';
    }
  }

  // ACTIONS — identity (a returning reader retypes nothing)
  restoreIdentity() {
    try {
      const stored = JSON.parse(localStorage.getItem(this.self.IDENTITY_KEY) ?? '{}');
      if (typeof stored.name === 'string') this.name.value = stored.name;
      if (typeof stored.email === 'string') this.email.value = stored.email;
    } catch {
      /* private mode, cleared storage — the form just starts empty */
    }
  }

  rememberIdentity() {
    try {
      localStorage.setItem(
        this.self.IDENTITY_KEY,
        JSON.stringify({ name: this.name.value, email: this.email.value }),
      );
    } catch {
      /* storage is a convenience, never a requirement */
    }
  }

  // ACTIONS — the form
  openReply(comment: BlogComments.PublicComment) {
    const rootId = comment.rootId ?? comment.id;
    if (this.threadLocked(rootId)) return;
    this.replyTo.value = comment.id;
    this.submittedTo.value = 0;
    this.state.value = 'idle';
    this.expand(rootId);
    // answering a REPLY addresses it by name — the level stays the same
    if (comment.parentId && !this.body.value.includes(`@${comment.name}`))
      this.body.value = `@${comment.name} ${this.body.value}`.trimStart();
    nextTick(() => this.focusBody());
  }

  focusBody() {
    this.bodyElement.value?.focus();
  }

  cancelReply() {
    this.replyTo.value = 0;
    this.body.value = '';
    this.state.value = 'idle';
  }

  mention(who: string) {
    if (this.body.value.includes(`@${who}`)) return;
    this.body.value = `${this.body.value.trimEnd()} @${who} `.trimStart();
    this.focusBody();
  }

  // ACTIONS — Turnstile
  async renderTurnstile() {
    const sitekey = this.self.TURNSTILE_SITE_KEY;
    if (!sitekey || !this.turnstileElement.value || this.turnstileWidgetId.value)
      return;
    await loadTurnstileScript();
    const turnstile = (window as any).turnstile;
    if (!turnstile || !this.turnstileElement.value) return;
    this.turnstileWidgetId.value = turnstile.render(this.turnstileElement.value, {
      sitekey,
      action: 'newsletter',
      theme: 'dark',
      appearance: 'interaction-only',
      callback: (token: string) => this.onTurnstileToken(token),
      'expired-callback': () => this.onTurnstileExpired(),
    });
  }

  onTurnstileToken(token: string) {
    this.turnstileToken.value = token;
  }

  onTurnstileExpired() {
    this.turnstileToken.value = '';
  }

  /** The form element changed (top-level ↔ inline reply): the old
   *  widget must go or the new form never gets one and submits
   *  token-less, which the Worker refuses. Render only if the reader
   *  had already engaged; a fresh form waits for its own first focus. */
  onTurnstileElement(element: HTMLElement | null) {
    if (!element) return;
    if (this.turnstileWidgetId.value) {
      (window as any).turnstile?.remove?.(this.turnstileWidgetId.value);
      this.turnstileWidgetId.value = undefined;
      this.turnstileToken.value = '';
      this.renderTurnstile();
    }
  }

  /** Turnstile spins up only on deliberate engagement — focusing a
   *  name/email/comment field — never on mount: an idle comment form
   *  must not load a third-party script + iframe for every reader. */
  ensureTurnstile() {
    if (!this.turnstileWidgetId.value) this.renderTurnstile();
  }

  /** render on demand and WAIT for the async token — never race it */
  async awaitTurnstileToken(): Promise<string> {
    if (!this.self.TURNSTILE_SITE_KEY) return '';
    await this.renderTurnstile();
    const deadline = Date.now() + this.self.TURNSTILE_TOKEN_DEADLINE_MS;
    while (!this.turnstileToken.value && Date.now() < deadline)
      await new Promise((resolve) => setTimeout(resolve, 150));
    return this.turnstileToken.value;
  }

  async submit() {
    if (!this.email.value || !this.body.value.trim() || this.isSending) return;
    this.state.value = 'sending';
    const target = this.replyTo.value;
    await this.awaitTurnstileToken();
    try {
      const response = await fetch(`${this.self.ENDPOINT}/comment`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          slug: this.slug,
          name: this.name.value,
          email: this.email.value,
          body: this.body.value,
          parentId: target || null,
          subscribeReplies: this.subscribeReplies.value,
          subscribe: this.alsoSubscribe.value,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
          ...(this.turnstileToken.value
            ? { turnstileToken: this.turnstileToken.value }
            : {}),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        this.state.value = 'done';
        this.submittedTo.value = target;
        this.body.value = '';
        this.rememberIdentity();
      } else {
        this.state.value = 'error';
        this.message.value =
          payload.error ?? 'Could not submit — try again in a minute.';
      }
    } catch {
      this.state.value = 'error';
      this.message.value = 'Could not submit — try again in a minute.';
    } finally {
      this.turnstileToken.value = '';
      if (this.turnstileWidgetId.value)
        (window as any).turnstile?.reset(this.turnstileWidgetId.value);
    }
  }
}

export namespace BlogComments {
  export const $Class = Static($BlogComments); // anchor — it declares statics
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  /** The Worker's public projection of a comment — no email, by construction. */
  export interface PublicComment {
    id: number;
    name: string;
    body: string;
    submittedAt: number;
    parentId: number | null;
    rootId: number | null;
    locked: number;
    avatarSeed: string;
  }

  export type SubmitState = 'idle' | 'sending' | 'done' | 'error';
  export type FollowState = 'idle' | 'leaving' | 'left';
}

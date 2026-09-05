import { ref, shallowRef, type ExtractPropTypes, type PropType } from 'vue';
import { useRoute } from 'vitepress';
import { definePropTypes, propsWithDefaults, Reactive } from '../../../../lib/Reactive';
import { Static } from '../../../../lib/Static';
import { captureEvent } from '../analytics';
import { loadTurnstileScript } from '../turnstile';

// The one-line signup: Name, Email, [Join the frontier]. Rides the
// blog toolbar, the blog footer, and the bottom of every post. Same
// endpoint and invisible Turnstile as the full card — this is the fast
// lane, not a separate system.
class $NewsletterQuickJoin {
  /** The newsletter Worker's public URL (see /newsletter/README.md). */
  static get ENDPOINT() {
    return 'https://ivue-newsletter.ekalashnikov.workers.dev';
  }

  /** Turnstile sitekey — the same widget as the full card. */
  static get TURNSTILE_SITE_KEY() {
    return '0x4AAAAAAESFVS2C9LMeYZpt';
  }

  /* Contract — STATIC */

  static get propsTypes() {
    return definePropTypes({
      placement: { type: String as PropType<string> },
      align: { type: String as PropType<NewsletterQuickJoin.Align> },
    });
  }

  static get propsDefaults() {
    return { placement: 'blog-inline', align: 'end' as NewsletterQuickJoin.Align };
  }

  static get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }

  constructor(public props: NewsletterQuickJoin.Props) {
    this.route = useRoute();
  }

  // resolved in setup (the constructor) — inject() needs the component instance
  protected readonly route: ReturnType<typeof useRoute>;

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $NewsletterQuickJoin;
  }

  // STATE
  get name() {
    return ref('');
  }
  get email() {
    return ref('');
  }
  get state() {
    return ref<NewsletterQuickJoin.State>('idle');
  }
  get message() {
    return ref('');
  }
  get turnstileToken() {
    return ref('');
  }
  // true only while Cloudflare shows the VISIBLE challenge — the form's
  // container can make room for it then, and only then
  get challenged() {
    return ref(false);
  }
  // Turnstile's widget handle — internal bookkeeping, not template state
  get turnstileWidgetId() {
    return shallowRef<string | undefined>(undefined);
  }

  // TEMPLATE-REF TARGET
  get turnstileElement() {
    return ref<HTMLElement | null>(null);
  }

  // PROPS
  get placement() {
    return this.props.placement;
  }
  get align() {
    return this.props.align;
  }

  // DERIVED
  get isBlogPost() {
    return /^\/blog\/.+/.test(this.route.path) && !this.route.path.endsWith('/blog/');
  }

  /** post-footer instances mount globally (doc-after slot) — they belong
   *  on blog posts only */
  get belongsHere() {
    if (this.placement !== 'post-footer') return true;
    return this.isBlogPost;
  }

  get sending() {
    return this.state.value === 'sending';
  }
  get succeeded() {
    return this.state.value === 'done';
  }
  get failed() {
    return this.state.value === 'error';
  }
  get formVisible() {
    return this.belongsHere && !this.succeeded;
  }
  get doneVisible() {
    return this.belongsHere && this.succeeded;
  }

  /** The placement + alignment modifiers, shared by the form and its done state. */
  get placementClasses() {
    return [`quickjoin--${this.align}`, `quickjoin--place-${this.placement}`];
  }
  get formClasses() {
    return [...this.placementClasses, { 'quickjoin--challenged': this.challenged.value }];
  }

  // ACTIONS

  /** Turnstile is deferred to the FIRST interaction with the form: the
   *  widget is invisible until challenged and its token matters only at
   *  submit — rendering it on mount put a third-party script + iframe on
   *  every homepage visit (felt as menu-open jank on iPhone). */
  ensureTurnstile() {
    if (!this.turnstileWidgetId.value) this.renderTurnstile();
  }

  // --- Turnstile (explicit render, invisible unless challenged) --------
  async renderTurnstile() {
    if (
      !this.self.TURNSTILE_SITE_KEY ||
      !this.turnstileElement.value ||
      this.turnstileWidgetId.value
    )
      return;
    await loadTurnstileScript();
    const turnstile = (window as any).turnstile;
    if (!turnstile || !this.turnstileElement.value) return;
    this.turnstileWidgetId.value = turnstile.render(this.turnstileElement.value, {
      sitekey: this.self.TURNSTILE_SITE_KEY,
      action: 'newsletter',
      theme: 'dark',
      appearance: 'interaction-only',
      callback: (token: string) => this.onTurnstileToken(token),
      'expired-callback': () => this.onTurnstileToken(''),
      'before-interactive-callback': () => this.onChallenge(true),
      'after-interactive-callback': () => this.onChallenge(false),
    });
  }

  onTurnstileToken(token: string) {
    this.turnstileToken.value = token;
  }

  onChallenge(visible: boolean) {
    this.challenged.value = visible;
  }

  resetTurnstile() {
    this.turnstileToken.value = '';
    if (this.turnstileWidgetId.value)
      (window as any).turnstile?.reset(this.turnstileWidgetId.value);
  }

  /** The token arrives ASYNC after the widget renders — a fast typist can
   *  submit before the callback fires, and the Worker fails closed on a
   *  missing token. So a submit renders on demand and WAITS (briefly) for
   *  the token instead of racing it. 45s: when Cloudflare decides the
   *  widget needs INTERACTION, the visible checkbox appears and a human
   *  needs time to click it — the submit must outwait the challenge. */
  async awaitTurnstileToken(): Promise<string> {
    if (!this.self.TURNSTILE_SITE_KEY) return '';
    await this.renderTurnstile();
    const deadline = Date.now() + 45_000;
    while (!this.turnstileToken.value && Date.now() < deadline)
      await new Promise((resolve) => setTimeout(resolve, 150));
    return this.turnstileToken.value;
  }

  async join() {
    if (!this.email.value || this.sending) return;
    this.state.value = 'sending';
    await this.awaitTurnstileToken();
    try {
      const response = await fetch(`${this.self.ENDPOINT}/subscribe`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: this.name.value,
          email: this.email.value,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
          ...(this.turnstileToken.value
            ? { turnstileToken: this.turnstileToken.value }
            : {}),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        this.state.value = 'done';
        captureEvent('newsletter_signup', { placement: this.placement });
      } else {
        this.state.value = 'error';
        this.message.value =
          payload.error ?? 'Could not subscribe — try again in a minute.';
      }
    } catch {
      this.state.value = 'error';
      this.message.value = 'Could not subscribe — try again in a minute.';
    } finally {
      this.resetTurnstile();
    }
  }
}

export namespace NewsletterQuickJoin {
  export const $Class = Static($NewsletterQuickJoin); // anchor — it declares statics; children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  // the type of every unwrapping surface (defineExpose, reactive())
  export type Instance = typeof Class.Instance;

  /* Types */

  export type Align = 'end' | 'center' | 'start';
  export type State = 'idle' | 'sending' | 'done' | 'error';
  export type Props = ExtractPropTypes<typeof $Class.props>;
}

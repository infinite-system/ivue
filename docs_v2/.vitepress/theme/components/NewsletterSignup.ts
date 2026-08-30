import { onMounted, onUnmounted, ref, useId } from 'vue';
import { useRoute } from 'vitepress';
import { Reactive } from '../../../../lib/Reactive';
import { captureEvent } from '../analytics';
import { loadTurnstileScript } from '../turnstile';

// The newsletter signup card — one component, four placements (desktop
// toast + pill, blog aside, blog doc-flow, mobile in-flow CTA), all
// driven by this model: which placement belongs on the current page,
// the Turnstile handshake, and the subscribe round-trip.
class $NewsletterSignup {
  // The card renders in several placements at once (aside + doc on blog
  // posts, one hidden by CSS) — a shared gradient id would resolve into
  // the display:none instance and paint nothing. Every instance gets its
  // own pair (assigned once in setup; never changes).
  readonly markGradientId: string;
  readonly markTileGradientId: string;

  private route: ReturnType<typeof useRoute>;
  // Turnstile's widget handle — internal bookkeeping, not template state
  private turnstileWidgetId: string | undefined;

  constructor(public props: NewsletterSignup.Props) {
    this.markGradientId = useId();
    this.markTileGradientId = useId();
    this.route = useRoute();
    onMounted(() => this.onMount());
    onUnmounted(() => this.onUnmount());
  }

  /** Turnstile spins up only on deliberate engagement — focusing a
   *  field — never on mount: an idle card must not load a third-party
   *  script + iframe (and Cloudflare's occasional visible box) for a
   *  visitor who never touches the form. */
  ensureTurnstile() {
    if (!this.turnstileWidgetId) this.renderTurnstile();
  }

  // STATE
  get toastVisible() {
    return ref(false);
  }
  get mounted() {
    return ref(false);
  }
  get name() {
    return ref('');
  }
  get email() {
    return ref('');
  }
  get state() {
    return ref<'idle' | 'sending' | 'done' | 'error'>('idle');
  }
  get message() {
    return ref('');
  }
  get turnstileToken() {
    return ref('');
  }

  // TEMPLATE-REF TARGET
  get turnstileElement() {
    return ref<HTMLElement | null>(null);
  }

  // PROPS
  get placement() {
    return this.props.placement;
  }

  // DERIVED
  get isBlogPost() {
    return (
      /^\/blog\/.+/.test(this.route.path) &&
      !this.route.path.endsWith('/blog/')
    );
  }

  /** toast+pill ride every NON-blog-post page (desktop) — a post already
   *  carries the card in its aside (or after the article), and the pill
   *  would sit on top of it; the mobile in-flow CTA closes every
   *  NON-blog page; the aside/doc inline variants are blog-only. */
  get belongsHere() {
    if (this.placement === 'toast') return !this.isBlogPost;
    if (this.placement === 'cta') return !this.isBlogPost;
    return this.isBlogPost;
  }

  get cardVisible() {
    return (
      this.belongsHere &&
      (this.placement !== 'toast' || this.toastVisible.value)
    );
  }

  get dismissable() {
    return this.placement === 'toast';
  }

  get placementClass() {
    return `newsletter--${this.placement}`;
  }

  /** The pill is the permanent, on-demand doorway: always present on
   *  non-blog pages once the card is closed. */
  get pillVisible() {
    return (
      this.placement === 'toast' &&
      this.mounted.value &&
      this.belongsHere &&
      !this.toastVisible.value
    );
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
    return !this.succeeded;
  }
  get quickLeadVisible() {
    return (
      (this.placement === 'toast' || this.placement === 'aside') &&
      !this.succeeded
    );
  }
  get buttonLabel() {
    return this.sending ? 'Joining…' : 'Join the list';
  }
  get turnstileEnabled() {
    return Boolean(NewsletterSignup.TURNSTILE_SITE_KEY);
  }

  // ACTIONS
  onMount() {
    this.mounted.value = true;
    if (this.placement !== 'toast') return;
    window.addEventListener('ivue:newsletter-open', this.onOpenRequested);
    const dismissedAt = Number(
      localStorage.getItem(NewsletterSignup.DISMISSED_KEY) ?? 0,
    );
    if (
      Date.now() - dismissedAt <
      NewsletterSignup.DISMISS_DAYS * 86_400_000
    )
      return;
    window.setTimeout(() => this.revealToast(), 9_000);
  }

  onUnmount() {
    if (this.placement === 'toast')
      window.removeEventListener('ivue:newsletter-open', this.onOpenRequested);
  }

  revealToast() {
    if (!this.isBlogPost) this.toastVisible.value = true;
  }

  dismiss() {
    this.toastVisible.value = false;
    localStorage.setItem(NewsletterSignup.DISMISSED_KEY, String(Date.now()));
  }

  openFromPill() {
    this.state.value = 'idle';
    this.message.value = '';
    this.toastVisible.value = true;
    captureEvent('newsletter_form_opened', { source: 'pill' });
  }

  /** Any page can request the signup form via the window event (e.g. the
   *  community page's subscribe button). Where the mobile in-flow form
   *  is on the page, scroll to it; otherwise pop the desktop toast. */
  onOpenRequested() {
    const inFlowForm = document.querySelector<HTMLElement>('.newsletter--cta');
    if (inFlowForm && inFlowForm.offsetParent !== null) {
      inFlowForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    this.openFromPill();
  }

  // --- Turnstile (explicit render, per-instance widget, reset after each
  // attempt — tokens are single-use) ----------------------------------
  async renderTurnstile() {
    if (
      !NewsletterSignup.TURNSTILE_SITE_KEY ||
      !this.turnstileElement.value ||
      this.turnstileWidgetId
    )
      return;
    await loadTurnstileScript();
    const turnstile = (window as any).turnstile;
    if (!turnstile || !this.turnstileElement.value) return;
    this.turnstileWidgetId = turnstile.render(this.turnstileElement.value, {
      sitekey: NewsletterSignup.TURNSTILE_SITE_KEY,
      action: 'newsletter',
      theme: 'dark',
      // invisible unless Turnstile actually needs the visitor to
      // interact — the passive "Success!" badge never shows
      appearance: 'interaction-only',
      callback: (token: string) => this.onTurnstileToken(token),
      'expired-callback': () => this.onTurnstileToken(''),
    });
  }

  onTurnstileToken(token: string) {
    this.turnstileToken.value = token;
  }

  resetTurnstile() {
    this.turnstileToken.value = '';
    if (this.turnstileWidgetId)
      (window as any).turnstile?.reset(this.turnstileWidgetId);
  }

  /** The token arrives async after render — a submit waits for it briefly
   *  rather than racing it (the Worker fails closed on a missing token).
   *  45s: when Cloudflare decides the widget needs INTERACTION, the
   *  visible checkbox appears and a human needs time to click it — the
   *  submit must outwait the challenge, not race it. */
  async awaitTurnstileToken(): Promise<string> {
    if (!NewsletterSignup.TURNSTILE_SITE_KEY) return '';
    await this.renderTurnstile();
    const deadline = Date.now() + 45_000;
    while (!this.turnstileToken.value && Date.now() < deadline)
      await new Promise((resolve) => setTimeout(resolve, 150));
    return this.turnstileToken.value;
  }

  async subscribe() {
    if (!this.email.value || this.sending) return;
    if (!NewsletterSignup.ENDPOINT) {
      this.state.value = 'error';
      this.message.value =
        'Signups open very soon — follow @evgenykalash on X meanwhile.';
      return;
    }
    this.state.value = 'sending'; // guard double-submits through the token wait
    await this.awaitTurnstileToken();
    try {
      const response = await fetch(`${NewsletterSignup.ENDPOINT}/subscribe`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: this.name.value,
          email: this.email.value,
          // the drip sends at the subscriber's LOCAL morning — the
          // browser knows the IANA zone for free
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
          ...(this.turnstileToken.value
            ? { turnstileToken: this.turnstileToken.value }
            : {}),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        this.state.value = 'done';
        this.message.value = 'Welcome aboard — see you in the next post.';
        captureEvent('newsletter_signup', { placement: this.placement });
        // long enough to actually read the confirmation
        window.setTimeout(() => (this.toastVisible.value = false), 8_000);
      } else {
        this.state.value = 'error';
        this.message.value =
          payload.error ??
          'Could not subscribe right now — try again in a minute.';
      }
    } catch {
      this.state.value = 'error';
      this.message.value =
        'Could not subscribe right now — try again in a minute.';
    } finally {
      // tokens are single-use — a fresh widget state for any retry
      this.resetTurnstile();
    }
  }
}

export namespace NewsletterSignup {
  export const $Class = $NewsletterSignup; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  // the type of every unwrapping surface (defineExpose, reactive())
  export type Instance = typeof Class.Instance;

  /* Values */

  /** The newsletter Worker's public URL (see /newsletter/README.md).
   *  Empty string keeps the form visible but dormant (soft-fail message
   *  on submit). */
  export const ENDPOINT = 'https://ivue-newsletter.ekalashnikov.workers.dev';

  /** Turnstile sitekey (dashboard → Turnstile → the ivue.dev widget).
   *  Empty string skips the widget; the Worker enforces verification only
   *  once its TURNSTILE_SECRET is set, so the two roll out together. */
  export const TURNSTILE_SITE_KEY = '0x4AAAAAAESFVS2C9LMeYZpt';

  export const DISMISSED_KEY = 'ivue-newsletter-dismissed';
  export const DISMISS_DAYS = 21;

  /* Types */

  export interface Props {
    placement: 'toast' | 'aside' | 'doc' | 'cta';
  }
}

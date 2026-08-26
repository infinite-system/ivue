import { Reactive } from 'ivue';
import { ref } from 'vue';
import { Api } from '../platform/Api';
import { AppRouter } from './AppRouter';

// The application store — the ivue store pattern: one module singleton
// reached through `AppStore.use()`, injected into models via a cached
// `$`-getter (`get $app() { return AppStore.use(); }`), never passed
// down as a prop. Holds the session gate and toasts; ROUTING belongs to
// vue-router (AppRouter) — the store only reads and pushes it, so the
// URL stays the single source of truth for the open view and the open
// email preview (/posts?preview=<slug>).
class $AppStore {
  // the router — resolved and cached on first touch
  protected get $router() {
    return AppRouter.Class.$router;
  }

  get DOMAINS(): { name: DomainName; label: string; home: ViewName }[] {
    return [
      { name: 'newsletter', label: 'Newsletter', home: 'subscribers' },
      { name: 'socials', label: 'Socials', home: 'x' },
    ];
  }

  get TABS_BY_DOMAIN(): Record<DomainName, { name: ViewName; label: string }[]> {
    return {
      newsletter: [
        { name: 'subscribers', label: 'Subscribers' },
        { name: 'lists', label: 'Lists' },
        { name: 'sends', label: 'Sent' },
        { name: 'posts', label: 'Posts' },
        { name: 'comments', label: 'Comments' },
        { name: 'send', label: 'Send' },
        { name: 'drip', label: 'Drip' },
        { name: 'stats', label: 'Stats' },
        { name: 'newsletter-settings', label: 'Settings' },
      ],
      socials: [
        { name: 'x', label: 'X' },
        { name: 'socials-settings', label: 'Settings' },
      ],
    };
  }

  get checking() {
    return ref(true);
  }

  get authenticated() {
    return ref(false);
  }

  get secretDraft() {
    return ref('');
  }

  get loginError() {
    return ref('');
  }

  get toasts() {
    return ref<Toast[]>([]);
  }

  // monotonic toast id source — survives dismissals, never reused
  get toastCounter() {
    return ref(0);
  }

  // ---- routing (derived from the router's reactive currentRoute) ----

  get view(): ViewName {
    return (this.$router.currentRoute.value.name as ViewName) ?? 'subscribers';
  }

  get emailPreviewSlug(): string {
    return String(this.$router.currentRoute.value.query.preview ?? '');
  }

  get activeDomain(): DomainName {
    return this.$router.currentRoute.value.path.startsWith('/socials')
      ? 'socials'
      : 'newsletter';
  }

  // Any email address, anywhere in the app, opens that subscriber's
  // modal — history, and the projected pipeline of what arrives next.
  // The address rides the query string, so the modal overlays whatever
  // view is open and survives a reload.
  get subscriberEmail(): string {
    return String(this.$router.currentRoute.value.query.subscriber ?? '');
  }

  // The dialog's tab rides the query too (?subscriberTab=upcoming), so
  // a tab choice survives reload and back/forward. Sent is the default
  // and keeps the URL clean (vue-router drops undefined params).
  get subscriberTab(): SubscriberTabName {
    return this.$router.currentRoute.value.query.subscriberTab === 'upcoming'
      ? 'upcoming'
      : 'sent';
  }

  isOpen(view: ViewName) {
    return this.view === view;
  }

  isDomainOpen(domain: DomainName) {
    return this.activeDomain === domain;
  }

  open(view: ViewName) {
    this.$router.push({ name: view });
  }

  sectionsLabel(domain: DomainName) {
    return `${domain} sections`;
  }

  openDomain(domain: DomainName) {
    const entry = this.DOMAINS.find((candidate) => candidate.name === domain);
    if (entry) this.open(entry.home);
  }

  // Any post slug, anywhere in the app, opens that post's email preview.
  openEmailPreview(slug: string) {
    this.$router.push({ name: 'posts', query: { preview: slug } });
  }

  closeEmailPreview() {
    this.$router.push({ name: 'posts' });
  }

  openSubscriber(email: string) {
    this.$router.push({
      query: {
        ...this.$router.currentRoute.value.query,
        subscriber: email,
      },
    });
  }

  openSubscriberTab(tab: SubscriberTabName) {
    this.$router.push({
      query: {
        ...this.$router.currentRoute.value.query,
        subscriberTab: tab === 'sent' ? undefined : tab,
      },
    });
  }

  closeSubscriber() {
    const {
      subscriber: _subscriber,
      subscriberTab: _subscriberTab,
      ...query
    } = this.$router.currentRoute.value.query;
    this.$router.push({ query });
  }

  // ---- session ----

  // On load: one probe decides between the app and the login gate. In
  // local dev the Vite proxy carries the secret, so the probe passes
  // with an empty sessionStorage.
  async probe() {
    try {
      await Api.Class.lists();
      this.authenticated.value = true;
    } catch {
      this.authenticated.value = false;
    } finally {
      this.checking.value = false;
    }
  }

  async login() {
    Api.Class.rememberSecret(this.secretDraft.value.trim());
    this.loginError.value = '';
    try {
      await Api.Class.lists();
      this.authenticated.value = true;
      this.secretDraft.value = '';
    } catch {
      Api.Class.forgetSecret();
      this.loginError.value = 'That secret was rejected — check and retry.';
    }
  }

  logout() {
    Api.Class.forgetSecret();
    this.authenticated.value = false;
  }

  // ---- toasts ----

  notify(message: string, tone: ToastTone = 'info') {
    const toast: Toast = { id: ++this.toastCounter.value, message, tone };
    this.toasts.value = [...this.toasts.value, toast];
    setTimeout(() => this.dismiss(toast.id), 4500);
  }

  dismiss(id: number) {
    this.toasts.value = this.toasts.value.filter((toast) => toast.id !== id);
  }

  // Shared failure path: session expiry falls back to the login gate,
  // anything else surfaces as a toast.
  reportFailure(error: unknown) {
    if (Api.Class.isUnauthorized(error)) {
      this.logout();
      return;
    }
    this.notify(
      error instanceof Error ? error.message : 'Something went wrong.',
      'error',
    );
  }

}

export namespace AppStore {
  export const $Class = $AppStore;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  let singleton: Instance | null = null;
  export function use(): Instance {
    return (singleton ??= new Class());
  }
}

export type DomainName = 'newsletter' | 'socials';
export type ViewName =
  | 'subscribers'
  | 'lists'
  | 'sends'
  | 'posts'
  | 'comments'
  | 'send'
  | 'drip'
  | 'stats'
  | 'newsletter-settings'
  | 'x'
  | 'socials-settings';
export type ToastTone = 'info' | 'success' | 'error';
export type SubscriberTabName = 'sent' | 'upcoming';

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

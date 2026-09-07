import { Reactive } from 'ivue';
import { Static } from 'ivue/extras';
import { ref } from 'vue';
import { Api } from '../platform/Api';
import { AppRouter } from './AppRouter';

// The application store — the ivue store pattern: one module singleton
// reached through `AppStore.Class.use()`, injected into models via a cached
// `$`-getter (`get $app() { return AppStore.Class.use(); }`), never passed
// down as a prop. Holds the session gate and toasts; ROUTING belongs to
// vue-router (AppRouter) — the store only reads and pushes it, so the
// URL stays the single source of truth for the open view and the open
// email preview (/posts?preview=<slug>).
class $AppStore {
  // The ONE instance, as a `$`-static: constructed on first read, after
  // the app exists, and cached on the receiver. It constructs through the
  // namespace slot, so a test double swapped into `Class` is what gets
  // built — the store has one receiver, the slot, so nothing forks.
  protected static get $shared(): AppStore.Instance {
    return new AppStore.Class();
  }

  static use(): AppStore.Instance {
    return this.$shared;
  }

  // the router — resolved and cached on first touch
  protected get $router() {
    return AppRouter.Class.$router;
  }

  get DOMAINS(): { name: AppStore.DomainName; label: string; home: AppStore.ViewName }[] {
    return [
      { name: 'newsletter', label: 'Newsletter', home: 'subscribers' },
      { name: 'socials', label: 'Socials', home: 'x' },
      { name: 'release', label: 'Release', home: 'release' },
      { name: 'press', label: 'Press', home: 'press' },
    ];
  }

  get TABS_BY_DOMAIN(): Record<AppStore.DomainName, { name: AppStore.ViewName; label: string }[]> {
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
      release: [
        { name: 'release', label: 'Calendar' },
        { name: 'release-venues', label: 'Venues' },
      ],
      press: [
        { name: 'press', label: 'Pieces' },
        { name: 'press-queue', label: 'Queue' },
        { name: 'press-sent', label: 'Sent' },
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
    return ref<AppStore.Toast[]>([]);
  }

  // monotonic toast id source — survives dismissals, never reused
  get toastCounter() {
    return ref(0);
  }

  // ---- routing (derived from the router's reactive currentRoute) ----

  get view(): AppStore.ViewName {
    return (this.$router.currentRoute.value.name as AppStore.ViewName) ?? 'subscribers';
  }

  get emailPreviewSlug(): string {
    return String(this.$router.currentRoute.value.query.preview ?? '');
  }

  get activeDomain(): AppStore.DomainName {
    const path = this.$router.currentRoute.value.path;
    if (path.startsWith('/socials')) return 'socials';
    if (path.startsWith('/release')) return 'release';
    if (path.startsWith('/press')) return 'press';
    return 'newsletter';
  }

  // the release calendar runs the full viewport width — seven readable
  // day columns need it; every other view keeps the reading measure
  get contentClass(): Record<string, boolean> {
    return { 'content--wide': this.activeDomain === 'release' || this.activeDomain === 'press' };
  }

  // the piece page belongs to the Pieces tab
  get tabView(): AppStore.ViewName {
    return this.view === 'press-piece' ? 'press' : this.view;
  }

  get pieceId(): number {
    return Number(this.$router.currentRoute.value.params.id ?? 0);
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
  get subscriberTab(): AppStore.SubscriberTabName {
    return this.$router.currentRoute.value.query.subscriberTab === 'upcoming'
      ? 'upcoming'
      : 'sent';
  }

  isOpen(view: AppStore.ViewName) {
    return this.tabView === view;
  }

  isDomainOpen(domain: AppStore.DomainName) {
    return this.activeDomain === domain;
  }

  open(view: AppStore.ViewName) {
    this.$router.push({ name: view });
  }

  sectionsLabel(domain: AppStore.DomainName) {
    return `${domain} sections`;
  }

  openPiece(id: number) {
    this.$router.push({ name: 'press-piece', params: { id: String(id) } });
  }

  openDomain(domain: AppStore.DomainName) {
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

  openSubscriberTab(tab: AppStore.SubscriberTabName) {
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

  notify(message: string, tone: AppStore.ToastTone = 'info') {
    const toast: AppStore.Toast = { id: ++this.toastCounter.value, message, tone };
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
  export const $Class = Static($AppStore); // anchor — it declares statics
  export let Class = Reactive($Class); // reactive — use() does the one `new`
  export type Instance = typeof Class.Instance;

  export type DomainName = 'newsletter' | 'socials' | 'release' | 'press';

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
    | 'socials-settings'
    | 'release'
    | 'release-venues'
    | 'press'
    | 'press-piece'
    | 'press-queue'
    | 'press-sent';

  export type ToastTone = 'info' | 'success' | 'error';

  export type SubscriberTabName = 'sent' | 'upcoming';

  export interface Toast {
    id: number;
    message: string;
    tone: ToastTone;
  }
}


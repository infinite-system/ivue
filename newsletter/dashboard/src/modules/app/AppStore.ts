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

  get TABS(): { name: ViewName; label: string }[] {
    return [
      { name: 'subscribers', label: 'Subscribers' },
      { name: 'sends', label: 'Sent' },
      { name: 'posts', label: 'Posts' },
      { name: 'send', label: 'Send' },
      { name: 'drip', label: 'Drip' },
      { name: 'stats', label: 'Stats' },
    ];
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

  // ---- routing (derived from the router's reactive currentRoute) ----

  get view(): ViewName {
    return (this.$router.currentRoute.value.name as ViewName) ?? 'subscribers';
  }

  get emailPreviewSlug(): string {
    return String(this.$router.currentRoute.value.query.preview ?? '');
  }

  isOpen(view: ViewName) {
    return this.view === view;
  }

  open(view: ViewName) {
    this.$router.push({ name: view });
  }

  // Any post slug, anywhere in the app, opens that post's email preview.
  openEmailPreview(slug: string) {
    this.$router.push({ name: 'posts', query: { preview: slug } });
  }

  closeEmailPreview() {
    this.$router.push({ name: 'posts' });
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
    const toast: Toast = { id: ++this.toastCounter, message, tone };
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

  toastCounter = 0;
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

export type ViewName =
  | 'subscribers'
  | 'sends'
  | 'posts'
  | 'send'
  | 'drip'
  | 'stats';
export type ToastTone = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

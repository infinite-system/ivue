import { Reactive } from 'ivue';
import { ref } from 'vue';
import { Api } from '../platform/Api';

// The application store — the ivue store pattern: one module singleton
// reached through `AppStore.use()`, injected into models via a cached
// `$`-getter (`get $app() { return AppStore.use(); }`), never passed
// down as a prop. Holds the session gate, the router, and toasts.
//
// Routing is the URL itself: each view is a path (deep-linkable, back/
// forward native), and the email preview rides /posts?preview=<slug> so
// a preview is shareable too. The Worker owns GET /drip
// (run_worker_first), so the drip view routes as /drip-plan.
class $AppStore {
  constructor() {
    window.addEventListener('popstate', () => this.syncFromLocation());
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

  get VIEW_ROUTES(): Record<ViewName, string> {
    return {
      subscribers: '/',
      sends: '/sent',
      posts: '/posts',
      send: '/send',
      drip: '/drip-plan',
      stats: '/stats',
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

  get view() {
    return ref<ViewName>(this.viewFromLocation());
  }

  get emailPreviewSlug() {
    return ref(this.previewSlugFromLocation());
  }

  get toasts() {
    return ref<Toast[]>([]);
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

  // ---- routing ----

  viewFromLocation(): ViewName {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    const match = (
      Object.entries(this.VIEW_ROUTES) as [ViewName, string][]
    ).find(([, route]) => route === path);
    return match ? match[0] : 'subscribers';
  }

  previewSlugFromLocation(): string {
    return new URLSearchParams(window.location.search).get('preview') ?? '';
  }

  syncFromLocation() {
    this.view.value = this.viewFromLocation();
    this.emailPreviewSlug.value = this.previewSlugFromLocation();
  }

  open(view: ViewName) {
    this.navigate(this.VIEW_ROUTES[view]);
  }

  // Any post slug, anywhere in the app, opens that post's email preview.
  openEmailPreview(slug: string) {
    this.navigate(`${this.VIEW_ROUTES.posts}?preview=${encodeURIComponent(slug)}`);
  }

  closeEmailPreview() {
    this.navigate(this.VIEW_ROUTES.posts);
  }

  navigate(route: string) {
    const current = window.location.pathname + window.location.search;
    if (route !== current) window.history.pushState({}, '', route);
    this.syncFromLocation();
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

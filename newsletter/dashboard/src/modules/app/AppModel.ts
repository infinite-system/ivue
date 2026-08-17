import { Reactive } from 'ivue';
import { ref } from 'vue';
import { Api } from '../platform/Api';

// The application shell: authentication gate, active view, and toasts.
// One instance, constructed in App.vue's setup — component-scoped for
// the lifetime of the app.
class $AppModel {
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
    return ref<ViewName>('subscribers');
  }

  get toasts() {
    return ref<Toast[]>([]);
  }

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

  open(view: ViewName) {
    this.view.value = view;
  }

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

export namespace AppModel {
  export const $Class = $AppModel;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
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

// Notification.ts — an app class opted into the kernel. The class key includes
// its owner namespace: plugins extending this class target `core/Notification`
// no matter which vendor supplies the plugin.
import { ref } from 'vue';
import { Reactive } from '../../ivue';
import { Kernel } from './Kernel';

export class $Notification {
  constructor(
    public message: string,
    public reportActivity: (event: string) => void,
  ) {}

  get isDismissed() {
    return ref(false);
  }
  get remainingSeconds() {
    return ref(8);
  }

  // Derived extension points stay plain so plugins can refine through super.
  get kind() {
    return 'Notification';
  }
  get icon() {
    return 'i';
  }
  get accent() {
    return '#6366f1';
  }
  get isPinned() {
    return false;
  }
  get lifetimeLabel() {
    return `Auto-dismisses in ${this.remainingSeconds.value}s`;
  }
  get lifetimeWidth() {
    return (this.remainingSeconds.value / 8) * 100 + '%';
  }
  get shouldShowCountdown() {
    return !this.isPinned;
  }

  show() {
    this.isDismissed.value = false;
    this.remainingSeconds.value = 8;
  }

  dismiss() {
    this.isDismissed.value = true;
  }

  tick() {
    if (this.isDismissed.value) return;
    this.remainingSeconds.value--;
    if (this.remainingSeconds.value <= 0) this.dismiss();
  }
}

export namespace Notification {
  export const $Class = $Notification; // raw — children/plugins extend this
  export let Class = Reactive($Class); // live binding — you `new` this
  export type Instance = typeof Class.Instance; // expose & reactive() interop
}

Kernel.Class.defineClass('core/Notification', Notification);

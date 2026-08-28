// ErrorNotification.ts — declared before plugins load. At seal, the kernel
// re-parents it onto the composed Notification class, so it inherits every
// plugin registered for `core/Notification`.
import { Reactive } from '../../ivue';
import { kernel } from './kernel';
import { Notification } from './Notification';

class $ErrorNotification extends Notification.$Class {
  override get kind() {
    return 'Error notification';
  }
  override get icon() {
    return '!';
  }
  override get accent() {
    return '#ef4444';
  }
}

export namespace ErrorNotification {
  export const $Class = $ErrorNotification; // raw — children/plugins extend this
  export let Class = Reactive($Class); // live binding — you `new` this
  export type Instance = typeof Class.Instance; // expose & reactive() interop
}

kernel.defineClass('core/ErrorNotification', ErrorNotification);

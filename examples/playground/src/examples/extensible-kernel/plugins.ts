// plugins.ts — vendor code. A vendor's own classes use its namespace, such as
// `acme-audit/AuditPanel`; a plugin extending a core class targets the core
// owner's key, `core/Notification`.
import { $Notification } from './Notification';

export type NotificationPlugin = (
  Base: typeof $Notification,
) => typeof $Notification;

export const analyticsPlugin: NotificationPlugin = (Base) =>
  class extends Base {
    show() {
      super.show();
      this.reportAnalytics(`SHOW · ${this.kind} · ${this.message}`);
    }
  };

export const priorityPlugin: NotificationPlugin = (Base) =>
  class extends Base {
    get accent() {
      return '#f59e0b';
    }
    get isPinned() {
      return true;
    }
    get lifetimeLabel() {
      return 'Pinned until dismissed';
    }

    tick() {
      // Priority Plugin replaces auto-dismiss: the countdown intentionally stops.
    }
  };

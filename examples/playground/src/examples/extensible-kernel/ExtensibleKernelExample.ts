// ExtensibleKernelExample.ts — each plugin toggle performs the production boot flow:
// reset registrations, register active plugins, seal the class graph, then
// reconstruct the visible notifications.
import { onUnmounted, ref, shallowRef } from 'vue';
import { Reactive } from '../../ivue';
import { ErrorNotification } from './ErrorNotification';
import { kernel } from './kernel';
import { Notification } from './Notification';
import {
  analyticsPlugin,
  priorityPlugin,
  type NotificationPlugin,
} from './plugins';

type NotificationKind = 'notification' | 'error';
type NotificationInstance = InstanceType<typeof Notification.Class>;
interface NotificationEntry {
  id: number;
  kind: NotificationKind;
  notification: NotificationInstance;
}
interface PluginEntry {
  id: string;
  label: string;
  description: string;
  enabledEffect: string;
  make: NotificationPlugin;
}
interface GraphNode {
  name: string;
  extends: string | null;
  plugins: string[];
}

class $ExtensibleKernelExample {
  constructor() {
    this.reboot();
    this.addNotification('notification');
    this.addNotification('error');
    const countdownTimer = window.setInterval(() => this.tick(), 1000);
    onUnmounted(() => window.clearInterval(countdownTimer));
  }

  get notifications() {
    return shallowRef<NotificationEntry[]>([]);
  }
  get activePlugins() {
    return ref<Record<string, boolean>>({ analytics: false, priority: true });
  }
  get graph() {
    return shallowRef<GraphNode[]>([]);
  }
  get nextNotificationId() {
    return ref(0);
  }
  get analyticsLog() {
    return ref<string[]>([]);
  }

  plugins: PluginEntry[] = [
    {
      id: 'priority',
      label: 'Priority Plugin',
      description: 'Changes toast lifetime and visual priority.',
      enabledEffect: 'Gold accent · pinned · auto-dismiss disabled',
      make: priorityPlugin,
    },
    {
      id: 'analytics',
      label: 'Analytics Plugin',
      description: 'Observes toast delivery without changing the toast UI.',
      enabledEffect: 'Every SHOW appears in the event stream',
      make: analyticsPlugin,
    },
  ];

  get visibleNotifications() {
    return this.notifications.value.filter(
      (entry) => !entry.notification.isDismissed.value,
    );
  }
  get hasVisibleNotifications() {
    return this.visibleNotifications.length > 0;
  }
  get hasAnalyticsEvents() {
    return this.analyticsLog.value.length > 0;
  }
  get isAnalyticsActive() {
    return this.isPluginActive('analytics');
  }

  isPluginActive(pluginId: string) {
    return Boolean(this.activePlugins.value[pluginId]);
  }

  pluginState(pluginId: string) {
    return this.isPluginActive(pluginId) ? 'ON' : 'OFF';
  }

  graphNodeHasParent(node: GraphNode) {
    return node.extends !== null;
  }

  graphNodeHasPlugins(node: GraphNode) {
    return node.plugins.length > 0;
  }

  /** Register, seal, and reconstruct: the whole boot sequence. */
  reboot() {
    const visibleNotifications = this.visibleNotifications;
    kernel.reset();
    this.analyticsLog.value = [];
    for (const plugin of this.plugins) {
      if (this.isPluginActive(plugin.id)) {
        kernel.registerClass('core/Notification', plugin.make, plugin.label);
      }
    }
    kernel.sealClassGraph();
    this.graph.value = kernel.getClassGraph();
    this.notifications.value = visibleNotifications.map((entry) =>
      this.buildNotification(entry.kind, entry.notification.message, entry.id),
    );
  }

  togglePlugin(pluginId: string) {
    this.activePlugins.value = {
      ...this.activePlugins.value,
      [pluginId]: !this.activePlugins.value[pluginId],
    };
    this.reboot();
  }

  buildNotification(
    kind: NotificationKind,
    message: string,
    id = ++this.nextNotificationId.value,
  ): NotificationEntry {
    const notification =
      kind === 'error'
        ? new ErrorNotification.Class(message, this.recordAnalytics)
        : new Notification.Class(message, this.recordAnalytics);
    notification.show();
    return { id, kind, notification };
  }

  addNotification(kind: NotificationKind) {
    const message =
      kind === 'error'
        ? 'Upload failed — retry the request.'
        : 'Draft saved to the cloud.';
    this.notifications.value = [
      ...this.notifications.value,
      this.buildNotification(kind, message),
    ];
  }

  tick() {
    for (const entry of this.notifications.value) entry.notification.tick();
    this.notifications.value = this.visibleNotifications;
  }

  dismissNotification(entry: NotificationEntry) {
    entry.notification.dismiss();
    this.notifications.value = this.visibleNotifications;
  }

  recordAnalytics(event: string) {
    this.analyticsLog.value = [...this.analyticsLog.value, event];
  }
}

export namespace ExtensibleKernelExample {
  export const $Class = $ExtensibleKernelExample; // raw — children `extends` this
  export const Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // expose & reactive() interop
}

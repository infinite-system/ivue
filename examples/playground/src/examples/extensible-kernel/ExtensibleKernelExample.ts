// ExtensibleKernelExample.ts — each plugin toggle performs the production boot flow:
// reset registrations, register active plugins, seal the class graph, then
// reconstruct the visible notifications.
import { onUnmounted, ref, shallowRef } from 'vue';
import { Reactive } from '../../ivue';
import { ErrorNotification } from './ErrorNotification';
import { Kernel } from './Kernel';
import { Notification } from './Notification';
import {
  activityPlugin,
  stickyPlugin,
  type NotificationPlugin,
} from './plugins';


class $ExtensibleKernelExample {
  constructor() {
    this.reboot();
    this.addNotification('notification');
    const countdownTimer = window.setInterval(() => this.tick(), 1000);
    onUnmounted(() => window.clearInterval(countdownTimer));
  }

  get notifications() {
    return shallowRef<ExtensibleKernelExample.NotificationEntry[]>([]);
  }
  get activePlugins() {
    return ref<Record<string, boolean>>({ activity: false, sticky: true });
  }
  get graph() {
    return shallowRef<ExtensibleKernelExample.GraphNode[]>([]);
  }
  get nextNotificationId() {
    return ref(0);
  }
  get activityLog() {
    return ref<string[]>([]);
  }

  plugins: ExtensibleKernelExample.PluginEntry[] = [
    {
      id: 'sticky',
      label: 'Sticky Plugin',
      description: 'Keeps toasts visible until they are dismissed.',
      enabledEffect: 'Gold accent · pinned · auto-dismiss disabled',
      make: stickyPlugin,
    },
    {
      id: 'activity',
      label: 'Activity Plugin',
      description: 'Observes toast delivery without changing the toast UI.',
      enabledEffect: 'Every SHOW appears in the event stream',
      make: activityPlugin,
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
  get hasActivityEvents() {
    return this.activityLog.value.length > 0;
  }
  get isActivityActive() {
    return this.isPluginActive('activity');
  }

  isPluginActive(pluginId: string) {
    return Boolean(this.activePlugins.value[pluginId]);
  }

  pluginState(pluginId: string) {
    return this.isPluginActive(pluginId) ? 'ON' : 'OFF';
  }

  graphNodeHasParent(node: ExtensibleKernelExample.GraphNode) {
    return node.extends !== null;
  }

  graphNodeHasPlugins(node: ExtensibleKernelExample.GraphNode) {
    return node.plugins.length > 0;
  }

  /** Register, seal, and reconstruct: the whole boot sequence. */
  reboot() {
    const visibleNotifications = this.visibleNotifications;
    Kernel.Class.reset();
    this.activityLog.value = [];
    for (const plugin of this.plugins) {
      if (this.isPluginActive(plugin.id)) {
        Kernel.Class.registerClass('core/Notification', plugin.make, plugin.label);
      }
    }
    Kernel.Class.sealClassGraph();
    this.graph.value = Kernel.Class.getClassGraph();
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
    kind: ExtensibleKernelExample.NotificationKind,
    message: string,
    id = ++this.nextNotificationId.value,
  ): ExtensibleKernelExample.NotificationEntry {
    const notification =
      kind === 'error'
        ? new ErrorNotification.Class(message, this.recordActivity)
        : new Notification.Class(message, this.recordActivity);
    notification.show();
    return { id, kind, notification };
  }

  addNotification(kind: ExtensibleKernelExample.NotificationKind) {
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

  dismissNotification(entry: ExtensibleKernelExample.NotificationEntry) {
    entry.notification.dismiss();
    this.notifications.value = this.visibleNotifications;
  }

  recordActivity(event: string) {
    this.activityLog.value = [...this.activityLog.value, event];
  }
}

export namespace ExtensibleKernelExample {
  export const $Class = $ExtensibleKernelExample; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // expose & reactive() interop

  /* Types */

  export type NotificationKind = 'notification' | 'error';
  export type NotificationInstance = InstanceType<typeof Notification.Class>;
  export interface NotificationEntry {
    id: number;
    kind: NotificationKind;
    notification: NotificationInstance;
  }
  export interface PluginEntry {
    id: string;
    label: string;
    description: string;
    enabledEffect: string;
    make: NotificationPlugin;
  }
  export interface GraphNode {
    name: string;
    extends: string | null;
    plugins: string[];
  }

}

import { ref } from 'vue';
import { Reactive } from '../../../ivue';
import { Static } from '../../../Static';
import { Kit } from '../../../kit/Kit';
import type { Chat } from '../Chat';
import { Index } from '../Index';
import ChatIndexView from '../ChatIndex.vue';
import { FilesPanel } from './FilesPanel';
import FilesPanelView from './FilesPanel.vue';
import { SettingsPanel } from './SettingsPanel';
import SettingsPanelView from './SettingsPanel.vue';

// The chat's side: a rail of tabs that is always there, and a panel that
// opens beside it for the tab the reader picked — the index, the files the
// session touched, the settings. The panel resizes by its grip and
// collapses back to the rail. Each tab is a role of this kit.
class $Sidebar {
  static get $kit() {
    return {
      Index: { namespace: Index, vue: ChatIndexView },
      Files: { namespace: FilesPanel, vue: FilesPanelView },
      Settings: { namespace: SettingsPanel, vue: SettingsPanelView },
    } satisfies Kit.Of<Chat.SidebarTab>;
  }

  static readonly TABS: Sidebar.Tab[] = [
    { id: 'Index', label: 'Index', icon: '⌕', hint: 'Search and select messages (⌘K)' },
    { id: 'Files', label: 'Files', icon: '▤', hint: 'The files this session touched' },
    { id: 'Settings', label: 'Settings', icon: '⚙', hint: 'Theme, density and the tree' },
  ];
  static readonly MIN_WIDTH = 280;
  static readonly MAX_WIDTH = 720;

  constructor(public props: Sidebar.Props) {}

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $Sidebar;
  }

  get kit() {
    return this.self.$kit;
  }

  get chat(): Chat.Model {
    return this.props.chat;
  }

  get width() {
    return ref(380);
  }

  get resizing() {
    return ref(false);
  }

  get tabs(): Sidebar.Tab[] {
    return this.self.TABS;
  }

  get tab(): Chat.SidebarTab | null {
    return this.chat.sidebarTab.value;
  }

  get isOpen(): boolean {
    return this.tab !== null;
  }

  /** the entry for the open tab; the rail alone when nothing is open */
  get entry(): Kit.Entry | null {
    return this.tab ? this.kit[this.tab] : null;
  }

  get panelStyle(): Record<string, string> {
    return { width: `${this.width.value}px` };
  }

  get sideClass(): Record<string, boolean> {
    return { 'ac-side-open': this.isOpen, 'ac-resizing': this.resizing.value };
  }

  isActive(tab: Sidebar.Tab): boolean {
    return this.tab === tab.id;
  }

  select(tab: Sidebar.Tab) {
    this.chat.toggleSidebar(tab.id);
  }

  close() {
    this.chat.closeSidebar();
  }

  onResizeStart(event: PointerEvent) {
    event.preventDefault();
    this.resizing.value = true;
    const startX = event.clientX;
    const startWidth = this.width.value;
    const move = (moving: PointerEvent) => this.resizeTo(startWidth + (startX - moving.clientX));
    const up = () => {
      this.resizing.value = false;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  resizeTo(width: number) {
    this.width.value = Math.max(this.self.MIN_WIDTH, Math.min(this.self.MAX_WIDTH, Math.round(width)));
  }
}

export namespace Sidebar {
  export const $Class = Static($Sidebar);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export interface Props {
    chat: Chat.Model;
    kit?: Kit.Entry;
  }

  export interface Tab {
    id: Chat.SidebarTab;
    label: string;
    icon: string;
    hint: string;
  }
}

import { Reactive } from '../../../ivue';
import { Static } from '../../../Static';
import { Kit } from '../../../kit/Kit';
import { VirtualScroller } from '../../virtual-scroller/VirtualScroller';
import VirtualScrollerView from '../../virtual-scroller/VirtualScroller.vue';
import type { Chat } from '../Chat';
import { ChatSettings } from '../ChatSettings';
import { TreeCatalog } from '../variants/TreeCatalog';

// The settings panel: the theme, the density and the tree. Every choice
// writes the page's settings store; the configuration layer reads the
// theme and the density on the next render, and the shell derives a new
// root for the tree. The panel shows the override each tree is, as data.
// Its sections are rows of its own scroller, like every list in the side.
class $SettingsPanel {
  /** the one role the panel composes: its own scroller over the sections */
  static get $kit() {
    return {
      Scroller: { namespace: VirtualScroller, vue: VirtualScrollerView }
    } satisfies Kit.Of<SettingsPanel.Role>;
  }

  /** the sections, in order — each a row of the scroller */
  static readonly SECTIONS: SettingsPanel.Section[] = [
    { id: 'theme', body: '', position: '1', label: 'Theme' },
    { id: 'density', body: '', position: '2', label: 'Density' },
    { id: 'tree', body: '', position: '3', label: 'Tree' }
  ];

  constructor(public props: SettingsPanel.Props) {}

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $SettingsPanel;
  }

  get kit() {
    return this.self.$kit;
  }

  get sections(): SettingsPanel.Section[] {
    return this.self.SECTIONS;
  }

  protected get $settings(): ChatSettings.Model {
    return ChatSettings.Class.use();
  }

  get chat(): Chat.Model {
    return this.props.chat;
  }

  get themes(): ChatSettings.Option<ChatSettings.Theme>[] {
    return ChatSettings.Class.THEMES;
  }

  get densities(): ChatSettings.Option<ChatSettings.Density>[] {
    return ChatSettings.Class.DENSITIES;
  }

  get trees(): TreeCatalog.Entry[] {
    return TreeCatalog.Class.TREES;
  }

  get tree(): TreeCatalog.Entry {
    return TreeCatalog.Class.entry(this.$settings.tree.value);
  }

  /** the override the current tree is, as the reader would write it */
  get patch(): string {
    return this.tree.patch;
  }

  isSection(section: SettingsPanel.Section, id: SettingsPanel.SectionId): boolean {
    return section.id === id;
  }

  rowText(section: SettingsPanel.Section): string {
    return section.label;
  }

  isTheme(value: ChatSettings.Theme): boolean {
    return this.$settings.theme.value === value;
  }

  isDensity(value: ChatSettings.Density): boolean {
    return this.$settings.density.value === value;
  }

  isTree(tree: TreeCatalog.Entry): boolean {
    return this.$settings.tree.value === tree.id;
  }

  setTheme(value: ChatSettings.Theme) {
    this.$settings.theme.value = value;
  }

  setDensity(value: ChatSettings.Density) {
    this.$settings.density.value = value;
  }

  setTree(tree: TreeCatalog.Entry) {
    this.$settings.tree.value = tree.id;
  }
}

export namespace SettingsPanel {
  export const $Class = Static($SettingsPanel);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export type Role = 'Scroller';
  export type SectionId = 'theme' | 'density' | 'tree';

  export interface Section extends VirtualScroller.BaseItem {
    id: SectionId;
    label: string;
  }

  export interface Props {
    chat: Chat.Model;
    kit?: Kit.Entry;
  }
}

import { Reactive } from '../../../ivue';
import { Static } from '../../../Static';
import type { Kit } from '../../../kit/Kit';
import type { Chat } from '../Chat';
import { ChatSettings } from '../ChatSettings';
import { TreeCatalog } from '../variants/TreeCatalog';

// The settings panel: the theme, the density and the tree. Every choice
// writes the page's settings store; the configuration layer reads the
// theme and the density on the next render, and the shell derives a new
// root for the tree. The panel shows the override each tree is, as data.
class $SettingsPanel {
  constructor(public props: SettingsPanel.Props) {}

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
  export const $Class = $SettingsPanel;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export interface Props {
    chat: Chat.Model;
    kit?: Kit.Entry;
  }
}

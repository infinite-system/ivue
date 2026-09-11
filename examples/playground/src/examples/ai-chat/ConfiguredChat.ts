import { Reactive } from '../../ivue';
import { Chat } from './Chat';
import { ChatSettings } from './ChatSettings';

// The configuration layer over the chat. `Chat` reads nothing but its own
// props; this subclass opens the theme and the density, each as one getter
// that reads the entry's props, then the page's settings, then `super`.
// A setting is a getter; precedence is inheritance order; the shipped
// class never learns that settings exist.
class $ConfiguredChat extends Chat.$Class {
  protected get $settings(): ChatSettings.Model {
    return ChatSettings.Class.use();
  }

  override get theme(): ChatSettings.Theme {
    return (
      (this.props.kit?.props?.theme as ChatSettings.Theme | undefined) ??
      this.$settings.theme.value ??
      super.theme
    );
  }

  override get density(): ChatSettings.Density {
    return (
      (this.props.kit?.props?.density as ChatSettings.Density | undefined) ??
      this.$settings.density.value ??
      super.density
    );
  }

  override get tree(): string {
    return this.$settings.tree.value ?? super.tree;
  }

  /** the open panel lives in the settings store, so it survives the remount a change of tree causes */
  override get sidebarTab() {
    return this.$settings.sidebarTab;
  }
}

export namespace ConfiguredChat {
  export const $Class = $ConfiguredChat; // no statics of its own — the layer inherits Chat's
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}

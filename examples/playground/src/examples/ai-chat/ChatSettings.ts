import { ref } from 'vue';
import { Reactive } from '../../ivue';
import { Static } from '../../Static';

// The reader's settings, one per page: the theme, the density and the
// tree the chat is rendered with. A store the settings panel writes and
// the configuration layer reads — the layer's getters look here after the
// kit's entry and before the shipped default.
class $ChatSettings {
  static readonly THEMES: ChatSettings.Option<ChatSettings.Theme>[] = [
    { value: 'midnight', label: 'Midnight', hint: 'the shipped dark palette' },
    { value: 'ivory', label: 'Ivory', hint: 'paper and ink' },
    { value: 'terminal', label: 'Terminal', hint: 'phosphor on black, mono' },
  ];

  static readonly DENSITIES: ChatSettings.Option<ChatSettings.Density>[] = [
    { value: 'cozy', label: 'Cozy', hint: 'room to read' },
    { value: 'compact', label: 'Compact', hint: 'more thread per screen' },
  ];

  protected static singleton: ChatSettings.Model | null = null;

  /** the one store per page, constructed on first touch */
  static use(): ChatSettings.Model {
    return (this.singleton ??= new ChatSettings.Class());
  }

  /** tests start from a fresh store */
  static reset() {
    this.singleton = null;
  }

  get theme() {
    return ref<ChatSettings.Theme>('midnight');
  }

  get density() {
    return ref<ChatSettings.Density>('cozy');
  }

  get tree() {
    return ref<string>('shipped');
  }

  /** the side panel that is open — kept here so a change of tree, which remounts the chat, keeps it open */
  get sidebarTab() {
    return ref<ChatSettings.SidebarTab | null>(null);
  }
}

export namespace ChatSettings {
  export const $Class = Static($ChatSettings);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
  export type Model = InstanceType<typeof Class>;

  export type Theme = 'midnight' | 'ivory' | 'terminal';
  export type Density = 'cozy' | 'compact';
  export type SidebarTab = 'Index' | 'Files' | 'Settings';

  export interface Option<Value extends string> {
    value: Value;
    label: string;
    hint: string;
  }
}

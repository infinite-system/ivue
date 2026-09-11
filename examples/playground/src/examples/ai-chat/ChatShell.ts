import { Reactive } from '../../ivue';
import { Static } from '../../Static';
import type { Kit } from '../../kit/Kit';
import { ChatSettings } from './ChatSettings';
import { ChatVariants } from './variants/ChatVariants';
import AiChatExampleView from './AiChatExample.vue';

// The shell around the example: it reads the page's settings and hands the
// example the entry for the tree the reader picked. The tree's namespace
// is the whole difference between two renders — the same AiChatExample.vue
// constructs whichever class the entry names. A change of tree remounts;
// a change of theme or density does not, the layer reads those live.
class $ChatShell {
  static readonly EXAMPLE_VIEW = AiChatExampleView;

  constructor(public props: ChatShell.Props) {}

  protected get self() {
    return this.constructor as typeof $ChatShell;
  }

  protected get $settings(): ChatSettings.Model {
    return ChatSettings.Class.use();
  }

  get dark(): boolean {
    return Boolean(this.props.dark);
  }

  get treeId(): string {
    return this.$settings.tree.value;
  }

  get tree(): ChatVariants.Tree {
    return ChatVariants.Class.tree(this.treeId);
  }

  /** the entry the seam receives: the chosen tree's namespace, the one example view */
  get entry(): Kit.Entry {
    return { namespace: this.tree.namespace, view: this.self.EXAMPLE_VIEW };
  }
}

export namespace ChatShell {
  export const $Class = Static($ChatShell);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export interface Props {
    dark?: boolean;
  }
}

import { ref } from 'vue';
import { Reactive } from '../../ivue';
import { Static } from '../../Static';
import type { Kit } from '../../kit/Kit';
import { ChatSettings } from './ChatSettings';
import { ChatVariants } from './variants/ChatVariants';
import ChatView from './Chat.vue';
import type { Chat } from './Chat';

// The shell around the example: it reads the page's settings and hands the
// example the entry for the tree the reader picked. The tree's namespace
// is the whole difference between two renders — the same Chat.vue
// constructs whichever class the entry names. A change of tree remounts;
// a change of theme or density does not, the layer reads those live.
class $ChatShell {
  static readonly EXAMPLE_VIEW = ChatView;

  constructor(public props: ChatShell.Props) {}

  protected get self() {
    return this.constructor as typeof $ChatShell;
  }

  /** The mounted example view (a template ref). A frame around the shell —
   *  the docs' feel strip — reaches the chat, and through it the scroller,
   *  along the exposed chain: shell → view → scroller. That is the
   *  standard's unwrapping surface, and it exists in production. A
   *  dev-only DOM internal (`__vueParentComponent`) used to be read
   *  instead, and on the built site it is simply not there. */
  get view() {
    return ref<Chat.Instance | null>(null);
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
    return { view: this.self.EXAMPLE_VIEW, namespace: this.tree.namespace };
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

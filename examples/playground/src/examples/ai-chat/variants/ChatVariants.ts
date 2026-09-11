import { Static } from '../../../Static';
import { Kit } from '../../../kit/Kit';
import { ConfiguredChat } from '../ConfiguredChat';
import { TreeCatalog } from './TreeCatalog';
import BubbleHeadView from './BubbleHead.vue';
import NoGutterView from './NoGutter.vue';
import MinimalHeadView from './MinimalHead.vue';
import MinimalFootView from './MinimalFoot.vue';

// The trees a reader can pick, resolved: the shipped chat, and overrides
// written as data over it — each a `Kit.Class.derive` of the configured
// chat, each swapping a few of the row's sections. The shipped tree is
// untouched by any of them. This file sits outside the chat's tree (the
// shell imports it) because it extends the layer the tree is made of.
class $ChatVariants {
  /** the trees, derived once per class */
  static get $trees(): ChatVariants.Tree[] {
    const namespaces: Record<string, Kit.Namespace> = {
      shipped: ConfiguredChat,
      bubbles: Kit.Class.derive(ConfiguredChat, {
        Message: { subkit: { Gutter: { vue: NoGutterView }, Head: { vue: BubbleHeadView } } }
      }),
      minimal: Kit.Class.derive(ConfiguredChat, {
        Message: {
          subkit: {
            Gutter: { vue: NoGutterView },
            Head: { vue: MinimalHeadView },
            Foot: { vue: MinimalFootView }
          }
        }
      })
    };
    return TreeCatalog.Class.TREES.map((entry) => ({
      ...entry,
      namespace: namespaces[entry.id] ?? ConfiguredChat
    }));
  }

  /** a tree by id, the shipped one for an id nobody knows */
  static tree(id: string): ChatVariants.Tree {
    return this.$trees.find((tree) => tree.id === id) ?? this.$trees[0];
  }
}

export namespace ChatVariants {
  export const $Class = Static($ChatVariants);
  export let Class = $Class;

  export interface Tree extends TreeCatalog.Entry {
    namespace: Kit.Namespace;
  }
}

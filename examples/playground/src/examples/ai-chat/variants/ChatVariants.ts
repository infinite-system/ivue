import { Static } from '../../../Static';
import { Kit } from '../../../kit/Kit';
import { ConfiguredChat } from '../ConfiguredChat';
import { TreeCatalog } from './TreeCatalog';
import BubbleHeadView from './BubbleHead.vue';
import MinimalHeadView from './MinimalHead.vue';

// The trees a reader can pick, resolved: the shipped chat, and patches over
// it — each a `Kit.Class.derive` of the configured chat that edits the
// row's order by relations against names and swaps a section or two. No
// tree copies a template: a dropped gutter is `without`, a rule under the
// head is a tag role inserted `after`, a receipt above the parts is a
// `move`. The shipped tree is untouched by any of them. This file sits
// outside the chat's tree (the shell imports it) because it extends the
// layer the tree is made of.
class $ChatVariants {
  /** the trees, derived once per class */
  static get $trees(): ChatVariants.Tree[] {
    const namespaces: Record<string, Kit.Namespace> = {
      shipped: ConfiguredChat,
      bubbles: Kit.Class.derive(
        ConfiguredChat,
        {
          Message: {
            subkit: { order: { without: ['Gutter'] }, Head: { view: BubbleHeadView } }
          }
        },
        { name: 'bubbles' }
      ),
      minimal: Kit.Class.derive(
        ConfiguredChat,
        {
          Message: {
            subkit: { order: { without: ['Gutter', 'Foot'] }, Head: { view: MinimalHeadView } }
          }
        },
        { name: 'minimal' }
      ),
      compact: Kit.Class.derive(
        ConfiguredChat,
        {
          Message: {
            subkit: {
              order: {
                without: ['Gutter'],
                after: { Head: ['Rule'] },
                move: { Foot: { before: 'Parts' } }
              },
              Rule: { view: 'hr', bind: () => ({ class: 'ac-rule' }) },
              Foot: { bind: ({ inherited }) => ({ ...inherited(), class: 'ac-foot-lead' }) }
            }
          }
        },
        { name: 'compact' }
      )
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

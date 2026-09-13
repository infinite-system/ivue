import { Static } from '../../../Static';

// The trees a reader can pick, as data the settings panel can show: an id,
// a label, a hint, and the patch as the reader would write it. The
// namespaces the ids resolve to live in ChatVariants, outside the chat's
// tree, so no class inside the tree imports the layer that extends it.
class $TreeCatalog {
  static readonly TREES: TreeCatalog.Entry[] = [
    {
      id: 'shipped',
      label: 'Shipped',
      tags: ['default', 'stock', 'plain'],
      hint: 'the chat as its files export it',
      patch: '// nothing — ConfiguredChat as its file exports it'
    },
    {
      id: 'bubbles',
      label: 'Bubbles',
      tags: ['messenger', 'round', 'chat'],
      hint: 'no gutter, a quiet head, the row in a bubble',
      patch: `Kit.Class.derive(ConfiguredChat, {
  Message: {
    subkit: {
      order: { without: ['Gutter'] },
      Header: { view: HeaderBubbleView },
    },
  },
})`
    },
    {
      id: 'minimal',
      label: 'Minimal',
      tags: ['bare', 'clean', 'quiet'],
      hint: 'turn number and time only, no receipts',
      patch: `Kit.Class.derive(ConfiguredChat, {
  Message: {
    subkit: {
      order: { without: ['Gutter', 'Footer'] },
      Header: { view: HeaderMinimalView },
    },
  },
})`
    },
    {
      id: 'compact',
      label: 'Compact',
      tags: ['dense', 'tight', 'small'],
      hint: 'a rule under the head, the receipt above the parts',
      patch: `Kit.Class.derive(ConfiguredChat, {
  Message: {
    subkit: {
      order: {
        without: ['Gutter'],
        after: { Header: ['Rule'] },
        move: { Footer: { before: 'MessagePartList' } },
      },
      Rule: { view: 'hr', bind: () => ({ class: 'ac-rule' }) },
      Footer: {
        bind: ({ inherited }) => ({ ...inherited(), class: 'ac-foot-lead' }),
      },
    },
  },
})`
    }
  ];

  /** an entry by id, the shipped one for an id nobody knows */
  static entry(id: string): TreeCatalog.Entry {
    return this.TREES.find((tree) => tree.id === id) ?? this.TREES[0];
  }
}

export namespace TreeCatalog {
  export const $Class = Static($TreeCatalog);
  export let Class = $Class;

  export interface Entry {
    id: string;
    label: string;
    hint: string;
    /** words a reader might search for it by, beyond its label and hint */
    tags: string[];
    /** the override as the reader would write it */
    patch: string;
  }
}

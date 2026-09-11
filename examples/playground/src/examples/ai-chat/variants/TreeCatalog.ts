import { Static } from '../../../Static';

// The trees a reader can pick, as data the settings panel can show: an id,
// a label, a hint, and the override as the reader would write it. The
// namespaces the ids resolve to live in ChatVariants, outside the chat's
// tree, so no class inside the tree imports the layer that extends it.
class $TreeCatalog {
  static readonly TREES: TreeCatalog.Entry[] = [
    {
      id: 'shipped',
      label: 'Shipped',
      hint: 'the chat as its files export it',
      patch: '// nothing — ConfiguredChat as its file exports it'
    },
    {
      id: 'bubbles',
      label: 'Bubbles',
      hint: 'no gutter, a quiet head, the body in a bubble',
      patch: `Kit.Class.derive(ConfiguredChat, {
  Message: {
    subkit: {
      Gutter: { view: NoGutterView },
      Head: { view: BubbleHeadView },
    },
  },
})`
    },
    {
      id: 'minimal',
      label: 'Minimal',
      hint: 'turn number and time only, no receipts',
      patch: `Kit.Class.derive(ConfiguredChat, {
  Message: {
    subkit: {
      Gutter: { view: NoGutterView },
      Head: { view: MinimalHeadView },
      Foot: { view: MinimalFootView },
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
    /** the override as the reader would write it */
    patch: string;
  }
}

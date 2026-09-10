import { ref } from 'vue';
import { Reactive } from '../../../../../lib/Reactive';
import { Static } from '../../../../../lib/Static';
import { Kit } from '@kit/Kit';
import { Panel } from '@kit/fixtures/Panel';
import { Card } from '@kit/fixtures/Card';
import { Code } from '@kit/fixtures/Code';
import PanelView from '@kit/fixtures/Panel.vue';
import { ThemedCode } from '@kit/fixtures/ThemedCode';
import FancyHeadView from '@kit/fixtures/FancyHead.vue';
import GroupedBodyView from '@kit/fixtures/GroupedBody.vue';
import FancyFrameView from '@kit/fixtures/FancyFrame.vue';

// The live proof for the Infinite Malleability page: one shipped tree
// (a panel of cards, each with a head, a body of code blocks and a frame)
// and four overrides written as data, each a `Kit.Class.derive` over the
// shipped root. The reader picks an override; the same Panel.vue renders
// it, because the entry handed to the seam names a different namespace.
// The inspector beside it walks the resolved kit and names what changed.
class $ExampleMalleability {
  /** The overrides, built once per receiver: every one is the shipped Panel plus a patch. */
  static get $variants(): ExampleMalleability.Variant[] {
    const sections = { Head: { vue: FancyHeadView }, Body: { vue: GroupedBodyView }, Frame: { vue: FancyFrameView } };
    const leaf = { Code: { namespace: ThemedCode } };
    const knobs = { Code: { props: { cap: 3, theme: 'paper' } } };
    return [
      {
        id: 'shipped',
        label: 'As shipped',
        tagline: 'The tree its authors wrote: a panel, two cards, code capped at four characters.',
        patch: '// nothing — Panel as its file exports it',
        namespace: Panel,
      },
      {
        id: 'sections',
        label: 'Sections swapped',
        tagline: 'Three sections of the card replaced two levels down. Card.vue and Panel.vue are untouched.',
        patch: `Kit.Class.derive(Panel, {
  Card: {
    subkit: {
      Head: { vue: FancyHeadView },
      Body: { vue: GroupedBodyView },
      Frame: { vue: FancyFrameView },
    },
  },
})`,
        namespace: Kit.Class.derive(Panel, { Card: { subkit: sections } }),
      },
      {
        id: 'leaf',
        label: 'Leaf class widened',
        tagline: 'The code block is now ThemedCode, a subclass with a theme prop and a select event. Its view was rewrapped to declare both.',
        patch: `Kit.Class.derive(Panel, {
  Card: { subkit: { Code: { namespace: ThemedCode } } },
})`,
        namespace: Kit.Class.derive(Panel, { Card: { subkit: leaf } }),
      },
      {
        id: 'knobs',
        label: 'Knobs turned',
        tagline: 'No class touched: the Code entry carries props, and the getters Code opened to the kit read them first.',
        patch: `Kit.Class.derive(Panel, {
  Card: { subkit: { Code: { props: { cap: 3, theme: 'paper' } } } },
})`,
        namespace: Kit.Class.derive(Panel, { Card: { subkit: knobs } }),
      },
      {
        id: 'all',
        label: 'All of it',
        tagline: 'Sections, class and a knob in one literal. ThemedCode declares theme as a prop with its own default, so the kit no longer decides it. The shipped tree is exactly as it was.',
        patch: `Kit.Class.derive(Panel, {
  Card: {
    subkit: {
      Head: { vue: FancyHeadView },
      Body: { vue: GroupedBodyView },
      Frame: { vue: FancyFrameView },
      Code: { namespace: ThemedCode, props: { cap: 3 } },
    },
  },
})`,
        namespace: Kit.Class.derive(Panel, {
          Card: { subkit: { ...sections, Code: { namespace: ThemedCode, props: { cap: 3 } } } },
        }),
      },
    ];
  }

  static readonly TITLES = ['alpha', 'beta'];

  /** The namespaces the tree is built from, by name — a minified build keeps no class names. */
  static get $named(): Map<Kit.Namespace, string> {
    return new Map<Kit.Namespace, string>([
      [Panel, 'Panel'],
      [Card, 'Card'],
      [Code, 'Code'],
      [ThemedCode, 'ThemedCode'],
    ]);
  }

  /** The base a namespace descends from through `derive`, and its name. */
  static baseName(namespace: Kit.Namespace): string {
    let current: Kit.Namespace | undefined = namespace;
    while (current?.derivedFrom) current = current.derivedFrom;
    return (current && this.$named.get(current)) ?? '?';
  }

  static isDerived(namespace: Kit.Namespace): boolean {
    return Boolean(namespace.derivedFrom);
  }

  static viewName(view: unknown): string {
    const name = (view as { __name?: string }).__name;
    return name ? `${name}.vue` : 'view';
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $ExampleMalleability;
  }

  get selectedId() {
    return ref<ExampleMalleability.Variant['id']>('shipped');
  }

  get variants(): ExampleMalleability.Variant[] {
    return this.self.$variants;
  }

  get selected(): ExampleMalleability.Variant {
    return this.variants.find((variant) => variant.id === this.selectedId.value) ?? this.variants[0];
  }

  /** The entry the seam receives: the chosen namespace, the one Panel.vue. */
  get entry(): Kit.Entry {
    return { namespace: this.selected.namespace, vue: PanelView };
  }

  get titles(): string[] {
    return this.self.TITLES;
  }

  /** The resolved kit as lines, from the root down: what the reader's choice actually changed. */
  get inspector(): ExampleMalleability.Line[] {
    const lines: ExampleMalleability.Line[] = [];
    this.walk('Panel', this.entry, 0, lines);
    return lines;
  }

  get isShipped(): boolean {
    return this.selected.id === 'shipped';
  }

  isSelected(variant: ExampleMalleability.Variant): boolean {
    return variant.id === this.selectedId.value;
  }

  select(variant: ExampleMalleability.Variant) {
    this.selectedId.value = variant.id;
  }

  protected walk(role: string, entry: Kit.Entry, depth: number, lines: ExampleMalleability.Line[]) {
    const namespace = entry.namespace;
    const self = this.self;
    lines.push({
      key: `${depth}-${role}`,
      role,
      depth,
      vue: self.viewName(entry.vue),
      className: namespace ? self.baseName(namespace) : '',
      derived: namespace ? self.isDerived(namespace) : false,
      props: entry.props ? JSON.stringify(entry.props) : '',
    });
    const kit = namespace?.Class.$kit;
    if (!kit) return;
    for (const [childRole, child] of Object.entries(kit)) {
      this.walk(childRole, child as Kit.Entry, depth + 1, lines);
    }
  }
}

export namespace ExampleMalleability {
  export const $Class = Static($ExampleMalleability); // anchor — it declares statics
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance;

  export interface Variant {
    id: 'shipped' | 'sections' | 'leaf' | 'knobs' | 'all';
    label: string;
    tagline: string;
    /** the override as the reader would write it */
    patch: string;
    namespace: Kit.Namespace;
  }

  export interface Line {
    key: string;
    role: string;
    depth: number;
    vue: string;
    className: string;
    derived: boolean;
    props: string;
  }
}

import { ref } from 'vue';
import { Reactive } from '../../../../../lib/Reactive';
import { Static } from '../../../../../lib/Static';
import { Kit } from '@kit/Kit';
import { Gallery } from './malleability/Gallery';
import GalleryView from './malleability/Gallery.vue';
import { Snippet } from './malleability/Snippet';
import { Code } from './malleability/Code';
import { HljsCode } from './malleability/HljsCode';
import TabHeadView from './malleability/TabHead.vue';
import StatsFootView from './malleability/StatsFoot.vue';

// The live proof for the Infinite Malleability page: one shipped tree — a
// gallery of snippet cards, each a head, a shiki-coloured code block and a
// foot — and four overrides written as data, each a `Kit.Class.derive`
// over the shipped root. The reader picks an override; the same
// Gallery.vue renders it, because the entry handed to the seam names a
// different namespace. The inspector beside it reads the resolved kit
// against the shipped one and names what changed.
class $ExampleMalleability {
  /** The overrides, built once per receiver: every one is the shipped Gallery plus a patch. */
  static get $variants(): ExampleMalleability.Variant[] {
    const sections = { Head: { vue: TabHeadView }, Foot: { vue: StatsFootView } };
    const engine = { Code: { namespace: HljsCode } };
    const knobs = { Code: { props: { theme: 'dracula', lineNumbers: true, maxLines: 8 } } };
    const root = 'docs_v2/.vitepress/theme/components/examples/malleability';
    return [
      {
        id: 'shipped',
        label: 'As shipped',
        tagline: 'The tree its authors wrote: a snippet card with a plain head, shiki in github-light, and a foot with a copy button.',
        patch: '// nothing — Gallery as its file exports it',
        namespace: Gallery,
        files: [
          { path: `${root}/Gallery.ts`, label: 'Gallery.ts' },
          { path: `${root}/Gallery.vue`, label: 'Gallery.vue' },
          { path: `${root}/Snippet.ts`, label: 'Snippet.ts' },
          { path: `${root}/Snippet.vue`, label: 'Snippet.vue' },
          { path: `${root}/SnippetHead.vue`, label: 'SnippetHead.vue' },
          { path: `${root}/SnippetFoot.vue`, label: 'SnippetFoot.vue' },
          { path: `${root}/Code.ts`, label: 'Code.ts' },
          { path: `${root}/Code.vue`, label: 'Code.vue' },
          { path: `${root}/Shiki.ts`, label: 'Shiki.ts' },
        ],
      },
      {
        id: 'sections',
        label: 'Sections swapped',
        tagline: 'The head becomes an editor tab bar and the foot a status bar, both painted from the block’s palette. Snippet.vue and Gallery.vue are untouched.',
        patch: `Kit.Class.derive(Gallery, {
  Snippet: {
    subkit: {
      Head: { vue: TabHeadView },
      Foot: { vue: StatsFootView },
    },
  },
})`,
        namespace: Kit.Class.derive(Gallery, { Snippet: { subkit: sections } }),
        files: [
          { path: `${root}/TabHead.vue`, label: 'TabHead.vue' },
          { path: `${root}/StatsFoot.vue`, label: 'StatsFoot.vue' },
          { path: `${root}/SnippetHead.vue`, label: 'SnippetHead.vue — what Head was' },
          { path: `${root}/SnippetFoot.vue`, label: 'SnippetFoot.vue — what Foot was' },
        ],
      },
      {
        id: 'engine',
        label: 'Engine swapped',
        tagline: 'The code block is now HljsCode: highlight.js instead of shiki, one static overridden, everything else inherited. Same theme name, another engine’s reading of it; the foot says which.',
        patch: `Kit.Class.derive(Gallery, {
  Snippet: {
    subkit: {
      Code: { namespace: HljsCode },
    },
  },
})`,
        namespace: Kit.Class.derive(Gallery, { Snippet: { subkit: engine } }),
        files: [
          { path: `${root}/HljsCode.ts`, label: 'HljsCode.ts' },
          { path: `${root}/Hljs.ts`, label: 'Hljs.ts' },
          { path: `${root}/Code.ts`, label: 'Code.ts — what it extends' },
          { path: `${root}/Shiki.ts`, label: 'Shiki.ts — the engine it replaced' },
        ],
      },
      {
        id: 'knobs',
        label: 'Knobs turned',
        tagline: 'No class touched: the Code entry carries a theme, line numbers and a fold, and the getters Code opened to the kit read them first.',
        patch: `Kit.Class.derive(Gallery, {
  Snippet: {
    subkit: {
      Code: {
        props: {
          theme: 'dracula',
          lineNumbers: true,
          maxLines: 8,
        },
      },
    },
  },
})`,
        namespace: Kit.Class.derive(Gallery, { Snippet: { subkit: knobs } }),
        files: [
          { path: `${root}/Code.ts`, label: 'Code.ts — the getters that read the kit' },
          { path: `${root}/Snippet.ts`, label: 'Snippet.ts — reads the same theme for its sections' },
        ],
      },
      {
        id: 'all',
        label: 'All of it',
        tagline: 'Sections, engine and knobs in one literal: tab bar, status bar, highlight.js in nord, numbered and folded. The shipped tree is exactly as it was.',
        patch: `Kit.Class.derive(Gallery, {
  Snippet: {
    subkit: {
      Head: { vue: TabHeadView },
      Foot: { vue: StatsFootView },
      Code: {
        namespace: HljsCode,
        props: {
          theme: 'nord',
          lineNumbers: true,
          maxLines: 8,
        },
      },
    },
  },
})`,
        namespace: Kit.Class.derive(Gallery, {
          Snippet: { subkit: { ...sections, Code: { namespace: HljsCode, props: { theme: 'nord', lineNumbers: true, maxLines: 8 } } } },
        }),
        files: [
          { path: `${root}/TabHead.vue`, label: 'TabHead.vue' },
          { path: `${root}/StatsFoot.vue`, label: 'StatsFoot.vue' },
          { path: `${root}/HljsCode.ts`, label: 'HljsCode.ts' },
          { path: 'examples/playground/src/kit/Kit.ts', label: 'Kit.ts — resolve, derive, view' },
        ],
      },
    ];
  }

  /** The namespaces the tree is built from, by name — a minified build keeps no class names. */
  static get $named(): Map<Kit.Namespace, string> {
    return new Map<Kit.Namespace, string>([
      [Gallery, 'Gallery'],
      [Snippet, 'Snippet'],
      [Code, 'Code'],
      [HljsCode, 'HljsCode'],
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

  /** `theme: 'dracula', lineNumbers: true` — the props bag as the reader would write it */
  static propsLabel(props: Record<string, unknown>): string {
    return Object.entries(props)
      .map(([key, value]) => `${key}: ${typeof value === 'string' ? `'${value}'` : JSON.stringify(value)}`)
      .join(', ');
  }

  /** The override literal, coloured minimally — strings, literals, the names — with no engine at all. */
  static patchHtml(patch: string): string {
    const escaped = patch.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return escaped
      .replace(/'[^']*'/g, (match) => `<span class="mal-str">${match}</span>`)
      .replace(/\b(true|false|null|\d+)\b/g, '<span class="mal-lit">$1</span>')
      .replace(/\b([A-Z][A-Za-z]+)\b/g, '<span class="mal-id">$1</span>')
      .replace(/\b(subkit|namespace|vue|props)(?=:)/g, '<span class="mal-key">$1</span>')
      .replace(/(\/\/.*)$/gm, '<span class="mal-cmt">$1</span>');
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

  /** The entry the seam receives: the chosen namespace, the one Gallery.vue. */
  get entry(): Kit.Entry {
    return { namespace: this.selected.namespace, vue: GalleryView };
  }

  /** The shipped tree's lines, the baseline every override is read against. */
  get baseline(): ExampleMalleability.Line[] {
    const lines: ExampleMalleability.Line[] = [];
    this.walk('Gallery', { namespace: Gallery, vue: GalleryView }, 0, lines);
    return lines;
  }

  /** The resolved kit as lines, from the root down, each marked with what the override changed. */
  get inspector(): ExampleMalleability.Line[] {
    const lines: ExampleMalleability.Line[] = [];
    this.walk('Gallery', this.entry, 0, lines);
    const before = new Map(this.baseline.map((line) => [line.key, line]));
    return lines.map((line) => {
      const was = before.get(line.key);
      const changedView = Boolean(was && was.vue !== line.vue);
      const changedClass = Boolean(was && was.className !== line.className);
      const changedProps = Boolean(was && was.props !== line.props);
      return { ...line, wasView: was?.vue ?? '', wasClass: was?.className ?? '', changedView, changedClass, changedProps, changed: changedView || changedClass || changedProps };
    });
  }

  /** what the live column shows, in a line: the engine, the theme, the sections */
  get liveLabel(): string {
    const lines = this.inspector;
    const code = lines.find((line) => line.role === 'Code');
    const head = lines.find((line) => line.role === 'Head');
    const engine = code?.className === 'HljsCode' ? 'highlight.js' : 'shiki';
    const theme = code?.props.match(/theme: '([^']+)'/)?.[1] ?? 'github-light';
    const sections = head?.vue === 'TabHead.vue' ? 'tab bar + status bar' : 'plain head + foot';
    return `${engine} · ${theme} · ${sections}`;
  }

  get patchHtml(): string {
    return this.self.patchHtml(this.selected.patch);
  }

  get changedCount(): number {
    return this.inspector.filter((line) => line.changed).length;
  }

  get changedLabel(): string {
    const count = this.changedCount;
    if (count === 0) return 'nothing changed — this is the shipped tree';
    return `${count} of ${this.inspector.length} roles changed; every other role is the shipped one`;
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
      props: entry.props ? self.propsLabel(entry.props) : '',
      wasView: '',
      wasClass: '',
      changedView: false,
      changedClass: false,
      changedProps: false,
      changed: false,
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
    id: 'shipped' | 'sections' | 'engine' | 'knobs' | 'all';
    label: string;
    tagline: string;
    /** the override as the reader would write it */
    patch: string;
    namespace: Kit.Namespace;
    /** the files this override brings or touches, shown beside the live tree */
    files: { path: string; label: string }[];
  }

  export interface Line {
    key: string;
    role: string;
    depth: number;
    vue: string;
    className: string;
    derived: boolean;
    props: string;
    wasView: string;
    wasClass: string;
    changedView: boolean;
    changedClass: boolean;
    changedProps: boolean;
    changed: boolean;
  }
}

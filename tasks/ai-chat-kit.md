# The AI chat on the kit — the first malleable tree

Convert `examples/playground/src/examples/ai-chat/` from its two
registries (`Parts`, `Tools`) to the kit design settled on 2026-09-09:
every model carries `static get $kit`, a template names roles and never
components, a parent hands a child its kit ENTRY as the one prop the
kit adds, and every view constructs the class the entry names over the
props the entry sets. The design
itself is recorded in `tasks/malleable-architecture.md` under "The kit";
this file is the build.

Status: designed; `Kit.ts` built and proven against a fixture tree
(`examples/playground/src/kit/`, 20 specs, 2026-09-10); the chat not yet
converted. Trigger: the first time a second view of
any chat model is wanted (a different scroller for the chat only, a
different code block for one page, an embed of the thread elsewhere) —
or the moment the standard is ready to take the kit rule and needs a
shipped instance to point at.

## The design, in the chat's terms

- **`static get $kit()` on every model that composes.** A lazy static
  getter, cached per class, returning the roles that model's subtree
  needs as `{ namespace, vue }` pairs (a role with its own class) or `{ vue }`
  (a leaf that takes props). Lazy is what makes the model↔view import
  cycle harmless: nothing reads the other side at module init. A
  subclass extends by spread: `{ ...super.$kit, Scroller: { … } }`.
- **The entry crosses the seam.** A parent renders
  `<component :is="chat.kit.Message.vue" :kit="chat.kit.Message" :row="item" :chat="chat" />`:
  the entry's view, the entry itself as the one prop `kit`, the child's
  own props. An entry is `{ vue, namespace?, props?, subkit? }` — the
  view, the namespace whose `Class` the view constructs, props the consumer set for the
  role, and a patch for the child's own kit. No inject. The child's
  model reads its kit from its own class — `get kit() { return this.self.$kit }`
  — so a swapped class brings its own kit, and no parent ever
  constructs a child.
- **Every view constructs the class it was handed.** The SFC is the
  wiring: `defineProps(ChatMessage.Class.props)`, one `new`, the
  destructure. The one line the kit adds is
  `new (props.kit?.namespace.Class ?? ChatMessage.Class)(props)`; the fallback is
  for a view mounted on its own (a docs demo, a spec). Lifecycle hooks
  in the constructor bind to the view's own component, exactly as today.
- **Props live on the class contract.** Every chat class moves from a
  type-only `Props` interface to the standard's statics — `propsTypes`,
  `propsDefaults`, `props` — and declares its own `kit` prop, typed to
  itself. The constructor's props line is the standard's, unchanged:
  `nestedProps(props, this.self.propsDefaults)`. An entry's `props` need
  no mechanism at all: `kit` is a prop, so `this.props.kit.props.cap` is
  an ordinary tracked read. The rule is the getter-layer rule: a class
  reads its own props and nothing else (closed by default); a setting
  is a getter; opening one is a layer, a subclass whose getter reads
  the entry and falls back to `super` —
  `override get cap() { return this.props.kit?.props?.cap ?? super.cap }`.
  Layers stack by inheritance, the source is the layer's choice (the
  entry, a settings store, a tenant record), and forcing a value is a
  layer whose getter returns it. No generated openers, no `open: [...]`
  list — we tried the mechanism route and every step cost more than the
  getter.
- **Override is subclassing.** A subclass with a spread `$kit` swaps a
  role: `FancyChat.$kit.Scroller = { namespace: SnapScroller, vue: SnapScrollerView }`.
  A swap that must reach a deep leaf is the same spread with an optional
  `subkit` on the entry — a patch over the child's own kit — which
  `Kit.Class.resolve` turns into derived subclasses once, at kit build time.
  One literal names the path from the root to the leaf; a class's own
  `$kit` never carries `subkit`.
- **Templates name roles.** Every child, leaf or not, renders through
  `<component :is="model.kit.Role.vue" …>`; a leaf that has no model of
  its own simply has no `model` in its entry and takes its props. No
  shell component: the parent chose the entry, so it knows the view;
  the view knows the model.
- **State that outlives a view lives on the parent's model as data.**
  Expanded ids, the streaming reply's revision, the clock, the loaded
  pages all sit on `Chat` today and stay there; a row's view can mount
  and unmount freely because nothing it must remember lives on it.
  Ownership of models does not move; only the choice of class and view
  does.
- **Vapor-neutral.** Views are SFCs, seams are `<component :is>`, the
  models never touch the VDOM. Nothing here is a render function.

## The code

Every sample below is the shape the converted file takes. Paths are
the chat folder's; the standard's namespace pattern is unchanged, and
the only new member on any class is `$kit`.

### `Kit.ts` — an entry, a patch, and the resolver

The class as it exists at `examples/playground/src/kit/Kit.ts`, proven by
`Kit.test.ts` and `kit.invariants.md` beside it against a real fixture
tree (a panel above a card above three sections and a code leaf, every
view a `<script setup>` SFC):

```ts
import type { Component } from 'vue';
import { Reactive } from '../../ivue';
import { Static } from '../../Static';

// The kit: the roles a model's subtree composes, as data on the class.
//
// A model declares `static get $kit()` returning a record of entries. An
// entry names a role's view and, when the role has a class of its own, the
// namespace that view constructs. A parent's template renders every seam
// as `<component :is="model.kit.Role.vue" :kit="model.kit.Role" …props />`;
// the child's view constructs `new (props.kit?.namespace.Class ?? X.Class)(props)`.
// A model reads its kit from its own class and nowhere else, so a swapped
// class brings its own kit and no parent ever constructs a child.
//
// `$kit` is a `$`-prefixed static getter, so `Static()` caches it once per
// receiver class through its own-property guard: a subclass that has not
// built its kit yet never sees its parent's. Nothing here caches.
//
// Overrides are subclasses. A subclass spreads `super.$kit` and replaces
// entries; an entry in an override may carry `subkit`, a patch over the
// roles below its namespace, which `resolve` turns into a derived namespace
// once, at kit build time. An entry may carry `props`, the consumer's
// values for the role, which the role's class reads in the getters its
// author opened (`this.props.kit?.props?.cap ?? this.props.cap`). Every
// function here builds new objects and reads the base; one tree never
// changes another.
class $Kit {
  /** Every entry with a `subkit` becomes an entry whose namespace is derived and whose view
   *  declares the derived contract; every other entry passes through untouched. */
  static resolve<K extends object>(kit: K): K {
    const out: Record<string, unknown> = {};
    for (const [role, value] of Object.entries(kit)) {
      out[role] = this.isEntry(value) ? this.resolveEntry(value) : this.resolve(value as object);
    }
    return this.deepFreeze(out) as K;
  }

  /** A derived namespace: `$Class` extends the base's raw class with a `$kit` that is the base's
   *  deep-merged with `patch` and resolved; `Class` is `Reactive($Class)` — what a subclass file
   *  would export — and `derivedFrom` names the base, since a minified build keeps no class names
   *  an inspector could read. The base namespace is only read. */
  static derive<Space extends Kit.Namespace>(namespace: Space, patch: Kit.Patch): Space {
    const kit = this;
    const Base = namespace.$Class as Kit.NamespaceClass;
    const $Class = Static(
      class extends Base {
        static get $kit() {
          return kit.resolve(kit.merge(Base.$kit ?? {}, patch));
        }
      },
    );
    return { ...namespace, $Class, Class: Reactive($Class), derivedFrom: namespace };
  }

  /** The same view over a different contract: a fresh component object with the base view's
   *  `setup` and `render` and the namespace's `props` and `emits`. Fresh because the view object
   *  is shared by every kit that names it — writing onto it would widen every tree — and because
   *  Vue caches a component's normalized options per app by that object, so a mounted view keeps
   *  its first contract whatever is written onto it later. A copy, not `Object.create`: Vue reads
   *  component options as own keys, and a prototype-backed view renders nothing. */
  static view<Space extends Kit.Namespace>(view: Component, namespace: Space): Component {
    const Class = namespace.Class as Kit.NamespaceClass;
    const copy: Record<string, unknown> = { ...(view as object) };
    if (Class.props) copy.props = Class.props;
    if (Class.emits) copy.emits = Class.emits;
    return copy as Component;
  }

  protected static resolveEntry(entry: Kit.Entry): Kit.Entry {
    if (!entry.namespace || !entry.subkit) return entry;
    const { subkit, ...rest } = entry;
    const namespace = this.derive(entry.namespace, subkit);
    return { ...rest, namespace, vue: this.view(entry.vue, namespace) };
  }

  protected static merge(base: Record<string, unknown>, patch: Kit.Patch): Record<string, unknown> {
    const out: Record<string, unknown> = { ...base };
    for (const [role, value] of Object.entries(patch)) {
      const current = base[role];
      out[role] =
        this.isEntry(current) || this.isEntry(value)
          ? this.mergeEntry(current as Kit.Entry | undefined, value as Partial<Kit.Entry>)
          : this.merge((current as Record<string, unknown>) ?? {}, value as Kit.Patch);
    }
    return out;
  }

  /** A patch that names a namespace and keeps the base view gets that view rewrapped over the new
   *  class, so `{ namespace: Themed }` alone declares what Themed declares; a patch that brings its
   *  own view is left alone — that view declares what it declares. */
  protected static mergeEntry(current: Kit.Entry | undefined, patch: Partial<Kit.Entry>): Kit.Entry {
    const merged = { ...current, ...patch } as Kit.Entry;
    if (patch.namespace && !patch.vue && current?.vue) merged.vue = this.view(current.vue, patch.namespace);
    return merged;
  }

  protected static isEntry(value: unknown): value is Kit.Entry {
    return typeof value === 'object' && value !== null && ('vue' in value || 'namespace' in value || 'subkit' in value);
  }

  /** Freeze the kit's SHAPE — role maps and entries — and stop at an entry's leaves: a namespace
   *  (its `Class` slot is the global override), a view (Vue's object), a `props` bag (the
   *  consumer's). Frozen entries are what make sharing them between kits safe. */
  protected static deepFreeze<K extends object>(value: K): K {
    const entry = this.isEntry(value);
    for (const [key, inner] of Object.entries(value)) {
      if (typeof inner !== 'object' || inner === null || Object.isFrozen(inner)) continue;
      if (entry && (key === 'namespace' || key === 'vue' || key === 'props')) continue;
      this.deepFreeze(inner);
    }
    return Object.freeze(value);
  }
}

export namespace Kit {
  export const $Class = Static($Kit);
  export let Class = $Class;

  /** A class as the kit reads it: the contract statics and the kit, all optional. */
  export type NamespaceClass = (abstract new (...args: any[]) => object) & {
    $kit?: Record<string, unknown>;
    props?: Record<string, unknown>;
    emits?: Record<string, unknown>;
  };

  /** What a namespace is at runtime: the raw class to extend and the reactive class to construct. */
  export interface Namespace {
    $Class: NamespaceClass;
    Class: NamespaceClass;
    /** set by `derive`: the namespace this one was derived from */
    derivedFrom?: Namespace;
  }

  export interface Entry<Space extends Namespace = Namespace> {
    vue: Component;
    /** the role's namespace — `$Class`, `Class`, and whatever else it exports; absent for a markup leaf */
    namespace?: Space;
    /** the consumer's values for this role, read by the class's own getters as `this.props.kit.props.x` */
    props?: Record<string, unknown>;
    /** an override only: a patch over the roles below this entry's namespace */
    subkit?: Patch;
  }

  /** A patch is a kit whose every field is optional; `{ subkit }` alone keeps namespace and view. */
  export type Patch = { [role: string]: Partial<Entry> | Patch };

  export type Of<Roles extends string> = Record<Roles, Entry>;
}
```

No cache lives in `Kit`. `$kit` is a `$`-prefixed static getter, and
`Static()` already caches such a getter once per receiver class through
an own-property guard, so a subclass that has not built its kit never
sees its parent's, in any read order. One consequence the spec pinned:
`super.$kit` inside an override runs the parent's getter body for the
child receiver, so the child's untouched entries are equal to the
parent's, not the same objects. Identity of untouched entries holds
inside a resolved kit, where `merge` reads the base through the base
class. Sharing is by equality; the freeze is what makes it safe.

An entry names a role's view and its namespace — `namespace`, the object
the class's own file exports, with `$Class` to extend and `Class` to
construct. The namespace is the unit because it is the identity the
codebase already exports, because `derive` then extends `$Class` (the
sanctioned move) and returns what a subclass file would export, and
because the kit's local swap and the `let Class` slot's global swap
become one object seen at two scopes. A resolved kit freezes its
entries and maps but never a namespace, a view or a `props` bag.

The name is deliberate: a `kit` is roles, a `subkit` is a patch over
the roles one level down. The two are different things and read
differently in a literal. A class's own `$kit` is written plain, with no
`subkit` or `props` anywhere; it needs no `resolve`. Both fields belong
to overrides. `subkit` names how deep a patch reaches and the resolver
turns each reach into a derived class once, cached on the class that
asked. `props` names what the patch tunes and never generates a class:
the entry is a prop, so the class reads `this.props.kit.props` where it
chooses to, in its own getters. `Kit` declares no prop: a kit-rendered
class declares `kit` in its own `propsTypes`, typed
`Kit.Entry<typeof X>` to its own namespace, so `props.kit?.namespace.Class`
is that class and the `new` in the view is typed. The class owns its
contract; `Kit` only resolves.

### `Chat.ts` — the root names four roles

```ts
import { Reactive } from '../../ivue';
import { Static } from '../../Static';
import type { Kit } from './Kit';
import { VirtualScroller } from '../virtual-scroller/VirtualScroller';
import VirtualScrollerView from '../virtual-scroller/VirtualScroller.vue';
import { ChatMessage } from './ChatMessage';
import ChatMessageView from './ChatMessage.vue';
import { Composer } from './Composer';
import ChatComposerView from './ChatComposer.vue';
import { Index } from './Index';
import ChatIndexView from './ChatIndex.vue';

class $Chat {
  // Lazy and cached per class: the views import this module, this module
  // imports the views, and nobody reads the other side until a template
  // renders. `Chat.$kit` and `FancyChat.$kit` are different objects.
  static get $kit() {
    return {
      Scroller: { namespace: VirtualScroller, vue: VirtualScrollerView },
      Message: { namespace: ChatMessage, vue: ChatMessageView },
      Composer: { namespace: Composer, vue: ChatComposerView },
      Index: { namespace: Index, vue: ChatIndexView },
    } satisfies Kit.Of<'Scroller' | 'Message' | 'Composer' | 'Index'>;
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $Chat;
  }

  /** the kit is the class's; a subclass with its own `$kit` swaps the subtree */
  get kit() {
    return this.self.$kit;
  }

  // …everything the chat already owns: rows, pages, streaming, the clock
}

export namespace Chat {
  export const $Class = Static($Chat);
  export let Class = Reactive($Class);
  export type Model = InstanceType<typeof Class>;
  export type Instance = typeof Class.Instance;
}
```

A `$`-prefixed static getter under `Static()` is cached once per
receiver class, so `$kit` is built once per class and a subclass builds
its own; no cache lives in `Kit`.

### `AiChatExample.vue` — the root template names roles

```vue
<script setup lang="ts">
import { Chat } from './Chat';
import './ai-chat.css';

const props = defineProps(Chat.Class.props); // dark, and kit

// the root constructs the class it was handed, or its own
const chat = new (props.kit?.namespace.Class ?? Chat.Class)();

const {
  // state refs
  rows,
  indexOpen,
  error,
  // element refs
  scroller,
} = chat;
</script>

<template>
  <div class="ai-chat" :class="{ 'ac-dark': dark, 'ac-index-open': indexOpen }">
    <header class="ac-top">…unchanged…</header>

    <p v-if="error" class="ac-error">{{ error }}</p>

    <div class="ac-main">
      <section class="ac-thread">
        <component
          :is="chat.kit.Scroller.vue"
          ref="scroller"
          :kit="chat.kit.Scroller"
          scrollbar
          v-model="rows"
          :assumed-size="96"
          :padding-quantity="6"
          :selection-text="chat.rowText"
        >
          <template #item="{ item }">
            <component :is="chat.kit.Message.vue" :kit="chat.kit.Message" :row="item" :chat="chat" />
          </template>
        </component>
        <button v-if="chat.showsJumpToLatest" type="button" class="ac-jump" @click="chat.jumpToLatest()">↓ latest</button>
      </section>
      <component :is="chat.kit.Index.vue" v-if="indexOpen" :kit="chat.kit.Index" :chat="chat" />
    </div>

    <component :is="chat.kit.Composer.vue" :kit="chat.kit.Composer" :chat="chat" />
  </div>
</template>
```

No component import remains in the root. The scroller keeps its
template ref, its `v-model`, its slot and every prop; the only
difference from today is that its tag is an `:is` and it receives its
entry — the class it constructs and any props the consumer set for
the role.

### `ChatMessage.ts` + `ChatMessage.vue` — a row resolves its parts

```ts
// ChatMessage.ts
import TextPartView from './parts/TextPart.vue';
import ThinkingPartView from './parts/ThinkingPart.vue';
import ToolCallPartView from './parts/ToolCallPart.vue';
import ToolBatchPartView from './parts/ToolBatchPart.vue';
import AttachmentPartView from './parts/AttachmentPart.vue';
import SystemPartView from './parts/SystemPart.vue';
import MessageGutterView from './sections/MessageGutter.vue';
import MessageHeadView from './sections/MessageHead.vue';
import MessageStubView from './sections/MessageStub.vue';
import MessagePartsView from './sections/MessageParts.vue';
import MessageAwaitView from './sections/MessageAwait.vue';
import MessageFootView from './sections/MessageFoot.vue';
import { ToolBatchPart } from './parts/ToolBatchPart';
import { ToolCallModel } from './tools/ToolCallModel';

class $ChatMessage {
  static get $kit() {
    return {
      // parts by role — the registry `Parts.ts` was, as entries; roles are PascalCase
      Text: { vue: TextPartView },
      Thinking: { vue: ThinkingPartView },
      Attachment: { vue: AttachmentPartView },
      System: { vue: SystemPartView },
      ToolCall: { vue: ToolCallPartView },
      ToolBatch: { namespace: ToolBatchPart, vue: ToolBatchPartView },
      // the tool cards are reached through the tool base's kit, one hop down
      Tool: { namespace: ToolCallModel, vue: ToolCallPartView },
      // the row's sections — each a markup view over the row model, swappable with a class of its own
      Gutter: { vue: MessageGutterView },
      Head: { vue: MessageHeadView },
      Stub: { vue: MessageStubView },
      Parts: { vue: MessagePartsView },
      Await: { vue: MessageAwaitView },
      Foot: { vue: MessageFootView },
    } satisfies Kit.Of<ChatMessage.PartRole | 'Tool' | ChatMessage.SectionRole>;
  }

  /** a part kind (the log's snake_case) names its role (the kit's PascalCase) */
  static readonly PART_ROLES: Record<SessionLog.Part['kind'], ChatMessage.PartRole> = {
    text: 'Text',
    thinking: 'Thinking',
    attachment: 'Attachment',
    system: 'System',
    tool_call: 'ToolCall',
    tool_batch: 'ToolBatch',
  };

  constructor(public props: ChatMessage.Props) {}

  protected get self() {
    return this.constructor as typeof $ChatMessage;
  }

  get kit() {
    return this.self.$kit;
  }

  /** a kind the kit does not name renders as text — the registry's old fallback */
  partEntry(part: SessionLog.Part): Kit.Entry {
    const role = this.self.PART_ROLES[part.kind];
    return (role && this.kit[role]) ?? this.kit.Text;
  }

  partView(part: SessionLog.Part) {
    return this.partEntry(part).vue;
  }

  // …roleLabel, rowClass, stub members, partKey — unchanged
}

export namespace ChatMessage {
  export const $Class = Static($ChatMessage);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export interface Props {
    row: Chat.Row;
    chat: Chat.Model;
    /** the entry this view was rendered through: the class it constructs, the consumer's defaults */
    kit?: Kit.Entry<typeof ChatMessage>;
  }
  // …in the build, this interface becomes `ExtractPropTypes<typeof $Class.props>` over a static
  // contract — `propsTypes` with `row`, `chat` required and `kit`; see CodeBlock below.

  export type PartRole = 'Text' | 'Thinking' | 'Attachment' | 'System' | 'ToolCall' | 'ToolBatch';
  export type SectionRole = 'Gutter' | 'Head' | 'Stub' | 'Parts' | 'Await' | 'Foot';

  /** what every part view receives — `Parts.Props` was, moved here when `Parts.ts` goes */
  export interface PartProps<Part extends SessionLog.Part = SessionLog.Part> {
    part: Part;
    chat: Chat.Model;
    message: SessionLog.Message | null;
  }
}
```

```vue
<!-- ChatMessage.vue -->
<script setup lang="ts">
import { ChatMessage } from './ChatMessage';

const props = defineProps(ChatMessage.Class.props);

const model = new (props.kit?.namespace.Class ?? ChatMessage.Class)(props);
</script>

<template>
  <article class="ac-msg" :class="model.rowClass">
    <component :is="model.kit.Gutter.vue" :kit="model.kit.Gutter" :model="model" />
    <div class="ac-msg-body">
      <component :is="model.kit.Head.vue" :kit="model.kit.Head" :model="model" />
      <component v-if="model.isStub" :is="model.kit.Stub.vue" :kit="model.kit.Stub" :model="model" />
      <component v-else :is="model.kit.Parts.vue" :kit="model.kit.Parts" :model="model" />
      <component v-if="model.receiptLabel" :is="model.kit.Foot.vue" :kit="model.kit.Foot" :model="model" />
    </div>
  </article>
</template>
```

```vue
<!-- sections/MessageHead.vue — one section, markup only over the row model -->
<script setup lang="ts">
import type { Kit } from '../Kit';
import type { ChatMessage } from '../ChatMessage';

defineProps<{ kit: Kit.Entry; model: ChatMessage.Instance }>();
</script>

<template>
  <header class="ac-msg-head">
    <strong class="ac-msg-role">{{ model.roleLabel }}</strong>
    <span v-if="model.modelLabel" class="ac-msg-model">{{ model.modelLabel }}</span>
    <span class="ac-msg-time">{{ model.timeLabel }}</span>
    <span class="ac-msg-index">{{ model.indexLabel }}</span>
  </header>
</template>
```

```vue
<!-- sections/MessageParts.vue — the collection section: it renders the parts, and the await line below them -->
<script setup lang="ts">
import type { Kit } from '../Kit';
import type { ChatMessage } from '../ChatMessage';

defineProps<{ kit: Kit.Entry; model: ChatMessage.Instance }>();
</script>

<template>
  <div class="ac-parts">
    <component
      :is="model.partView(part)"
      v-for="(part, at) in model.parts"
      :key="model.partKey(part, at)"
      :kit="model.partEntry(part)"
      :part="part"
      :chat="model.chat"
      :message="model.message"
    />
    <component v-if="model.isAwaitingFirstToken" :is="model.kit.Await.vue" :kit="model.kit.Await" :model="model" />
  </div>
</template>
```

Every seam in the design is now one shape: `:is` from the entry, `:kit`
the entry, then props. The row's sections are roles whose base views are
small markup SFCs over the row model — the same kind of file `ToolHead`
is — and each renders its own children, so a swap of any section brings
a whole template and, if its entry is given a namespace, a class inside
it. The row view keeps only its skeleton: the article, the body, and
the sections in order. What the row passes a section is what it passes
any child: the entry, and the model it belongs to, the way a row
receives `chat`. Arrangement is malleable at every level because the
thing that arranges is always a view somebody can replace.

`Parts.ts` is deleted. Roles are PascalCase everywhere in a kit; the
log's snake_case kinds map to them through one static table, so the
kit never carries a data format's spelling. A leaf part (Text,
Thinking) receives an entry with no model and constructs its own small
class as today. `ToolBatch` has a model and constructs the one it is
handed.

### `ToolCallModel.ts` — the tool base owns the cards and the shared leaves

```ts
import ToolHeadView from './ToolHead.vue';
import ToolFootView from './ToolFoot.vue';
import { CodeBlock } from './CodeBlock';
import CodeBlockView from './CodeBlock.vue';
import { BashCall } from './BashCall';
import BashCallView from './BashCall.vue';
// …one pair per tool, as `Tools.ts` imports today
import GenericCallView from './GenericCall.vue';

class $ToolCallModel {
  static get $kit() {
    return {
      Head: { vue: ToolHeadView },
      Foot: { vue: ToolFootView },
      CodeBlock: { namespace: CodeBlock, vue: CodeBlockView },
      Generic: { namespace: ToolCallModel, vue: GenericCallView },
      Mcp: { namespace: McpCall, vue: McpCallView },
      Task: { namespace: TaskCall, vue: TaskCallView },
      Tools: {
        Bash: { namespace: BashCall, vue: BashCallView },
        Edit: { namespace: EditCall, vue: EditCallView },
        NotebookEdit: { namespace: EditCall, vue: EditCallView },
        Read: { namespace: ReadCall, vue: ReadCallView },
        Write: { namespace: WriteCall, vue: WriteCallView },
        Agent: { namespace: AgentCall, vue: AgentCallView },
        Skill: { namespace: SkillCall, vue: SkillCallView },
        WebFetch: { namespace: WebFetchCall, vue: WebFetchCallView },
        WebSearch: { namespace: WebFetchCall, vue: WebFetchCallView },
        Artifact: { namespace: ArtifactCall, vue: ArtifactCallView },
      } as Record<string, Kit.Entry>,
    });
  }

  /** the lookup `Tools.componentFor` was: exact name, then family, then generic */
  static toolFor(name: string): Kit.Entry {
    const kit = this.$kit;
    const exact = kit.Tools[name];
    if (exact) return exact;
    if (name.startsWith('mcp__')) return kit.Mcp;
    if (/^Task(Create|Update|List|Get|Stop|Output)$/.test(name)) return kit.Task;
    return kit.Generic;
  }

  constructor(public props: ToolCallModel.Props) {}

  protected get self() {
    return this.constructor as typeof $ToolCallModel;
  }

  get kit() {
    return this.self.$kit;
  }

  // …call, chat, name, icon, summary, sections, toggle, cap — unchanged
}

export namespace ToolCallModel {
  export const $Class = Static($ToolCallModel);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export interface Props {
    call: SessionLog.ToolCall;
    chat: Chat.Model;
    message: SessionLog.Message | null;
    kit?: Kit.Entry<typeof ToolCallModel>;
  }
}
```

`Tools.ts` is deleted; `toolFor` is its lookup as a static on the base,
reading `this.$kit`, so a subclass of the base that overrides the map
is looked up through its own kit. The base and each tool card import
each other, which is the cycle the lazy getter exists for.

### `ToolCallPart.vue` — the seam that picks a card

```vue
<script setup lang="ts">
import type { SessionLog } from '../SessionLog';
import type { ChatMessage } from '../ChatMessage';
import { ToolCallModel } from '../tools/ToolCallModel';

// A part with one call: look the card up on the tool base the row's kit
// names, then render it with the class it names. Markup only.
const props = defineProps(ToolCallPart.Class.props); // part, chat, message, and kit

const base = props.kit?.namespace.Class ?? ToolCallModel.Class;
</script>

<template>
  <component
    :is="base.toolFor(part.call.name).vue"
    :kit="base.toolFor(part.call.name)"
    :call="part.call"
    :chat="chat"
    :message="message"
  />
</template>
```

This leaf is the one place a template calls a method twice for one
element. If the gate objects, the part becomes a two-line class with a
`card` getter and the template reads `model.card.vue` and
`model.card.namespace`; the shape is the same.

### `BashCall.vue` — a card renders its leaves through the base's kit

```vue
<script setup lang="ts">
import { BashCall } from './BashCall';
import type { ToolCallModel } from './ToolCallModel';

const props = defineProps(BashCall.Class.props);

const model = new (props.kit?.namespace.Class ?? BashCall.Class)(props);
</script>

<template>
  <div class="ac-tool ac-tool-bash" :class="model.cardClass">
    <component :is="model.kit.Head.vue" :model="model" />
    <div v-if="model.isExpanded" class="ac-tool-body">
      <p v-if="model.description" class="ac-tool-caption">{{ model.description }}</p>
      <section class="ac-tool-section">
        <h5>command <span v-if="model.ranInBackground" class="ac-tag">background</span></h5>
        <component :is="model.kit.CodeBlock.vue" :kit="model.kit.CodeBlock" :code="model.command" lang="bash" :cap="model.cap" wrap />
      </section>
      <section v-if="model.hasStdout" class="ac-tool-section">
        <h5>stdout <span class="ac-tag" :class="model.stateClass">{{ model.exitLabel }}</span></h5>
        <component :is="model.kit.CodeBlock.vue" :kit="model.kit.CodeBlock" :code="model.stdout" lang="text" :cap="model.cap" wrap />
      </section>
      <component :is="model.kit.Foot.vue" :model="model" />
    </div>
  </div>
</template>
```

`BashCall.ts` does not change: it extends the base and inherits `$kit`
through the static chain, so `BashCall.$kit === ToolCallModel.$kit`
until a subclass says otherwise. `ToolHead` and `ToolFoot` are markup
leaves that take the card's instance as `model`, exactly as today; they
render through the kit so a consumer can replace them, and take no
entry because they construct nothing.

### `CodeBlock.ts` + `CodeBlock.vue` — the props contract, and what an entry's `props` becomes

```ts
// CodeBlock.ts — the static contract every chat class moves onto
import type { ExtractPropTypes, PropType } from 'vue';
import { definePropTypes, propsWithDefaults, Reactive, type ExtractPropDefaultTypes } from '../../../ivue';
import { nestedProps, Static } from '../../../Static';
import { Kit } from '../Kit';

class $CodeBlock {
  static get propsTypes() {
    return definePropTypes({
      code: { type: String as PropType<string>, required: true },
      lang: { type: String as PropType<string> },
      cap: { type: Number as PropType<number | null> },
      wrap: { type: Boolean as PropType<boolean> },
      tone: { type: String as PropType<'plain' | 'error' | 'muted'> },
      startLine: { type: Number as PropType<number> },
      /** the entry this view was rendered through — the class's own prop, typed to the class */
      kit: { type: Object as PropType<Kit.Entry<typeof CodeBlock>> }, // the namespace's own type, declared below
    });
  }

  static get propsDefaults(): ExtractPropDefaultTypes<typeof $CodeBlock.propsTypes> {
    return { lang: 'text', cap: null, wrap: false, tone: 'plain', startLine: 1, kit: undefined };
  }

  static get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }

  constructor(public props: CodeBlock.Props) {
    nestedProps(props, this.self.propsDefaults); // the standard's line, unchanged
    onMounted(() => this.colour());
    // …
  }

  protected get self() {
    return this.constructor as typeof $CodeBlock;
  }

  /** a prop the kit may tune: the consumer's value first, then what the card passed */
  get cap(): number | null {
    return this.props.kit?.props?.cap ?? this.props.cap;
  }

  /** a prop the kit cannot touch — on purpose: the code is the card's */
  get code(): string {
    return this.props.code;
  }

  /** a prop that exists only through the kit — the path says so */
  get theme(): string | undefined {
    return this.props.kit?.props?.theme;
  }

  // …html, visibleCode, isCapped, colour — unchanged
}

export namespace CodeBlock {
  export const $Class = Static($CodeBlock);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
  export type Props = ExtractPropTypes<typeof $Class.props>;
}
```

```vue
<script setup lang="ts">
import { CodeBlock } from './CodeBlock';

const props = defineProps(CodeBlock.Class.props);

const model = new (props.kit?.namespace.Class ?? CodeBlock.Class)(props);
</script>

<template>
  <div class="ac-code" :class="model.blockClass" :style="model.blockStyle" v-html="model.renderedHtml"></div>
</template>
```

When a consumer's kit says `CodeBlock: { …, props: { cap: 2_000 } }`,
the entry arrives as the `kit` prop like any other prop, and the `cap`
getter reads the consumer's value first. Nothing is layered, merged,
proxied or created: `this.props` is Vue's object, `nestedProps` is the
function it is today, and a read of `this.props.kit.props.cap` goes
through Vue's props proxy and is tracked like every other prop read.

Which props a kit may tune is each class's decision, made where the
class already states what a prop means — its getter. Three shapes, all
greppable:

- `this.props.kit?.props?.cap ?? this.props.cap` — a tunable; the kit's
  word wins over the template's.
- `this.props.kit?.props?.theme` — an extension; a prop the class has
  only through the kit, typed by the getter.
- `this.props.code` — the kit cannot reach it, on purpose.

A consumer who needs a prop the author did not open derives the class
and overrides the getter — `override get cap() { return 2_000 }` — and
points the entry's `namespace` at it. That is the ordinary move and it
reaches every prop of every class; the entry's `props` are the sugar
for the knobs an author chose to expose. Vue's own boundary — a parent
template cannot pass a key the component did not declare, a child
cannot emit an event it did not declare without a dev warning — is
closed by `Kit.Class.vue`, below: a derived class's widened contract
becomes the declared contract of the view that renders it.

### `VirtualScroller.vue` — one optional prop, everything else untouched

```ts
// VirtualScroller.ts — one spread in the contract it already has
static get propsTypes() {
  return definePropTypes({ ...super.propsTypes /* the existing map */, kit: { type: Object as PropType<Kit.Entry<typeof VirtualScroller>> } });
}

// VirtualScroller.vue — the one line that changes
const virtualScroller = new (props.kit?.namespace.Class ?? VirtualScroller.Class)<T>(props, emit);
```

The scroller's own example, the horizontal scroller and the text
marquee never pass `kit`, so they construct the default with their own
props exactly as before.

## Extensions — what the kit makes a two-line change

Each of these is a subclass with a spread `$kit`, and the parent's kit
naming the subclass. None edits a file in the chat folder.

### A different scroller under the chat only

```ts
// FancyChat.ts
import { Reactive } from '../../ivue';
import { Static } from '../../Static';
import { Chat } from './Chat';
import { SnapScroller } from '../snap-scroller/SnapScroller';
import SnapScrollerView from '../snap-scroller/SnapScroller.vue';

class $FancyChat extends Chat.$Class {
  static override get $kit() {
    return {
      ...super.$kit,
      Scroller: { namespace: SnapScroller, vue: SnapScrollerView },
    });
  }
}

export namespace FancyChat {
  export const $Class = Static($FancyChat);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
```

```vue
<!-- the playground's second route -->
<AiChatExample :kit="{ namespace: FancyChat, vue: AiChatExample }" />
```

The scroller's contract with the chat is the surface `Chat` reads:
`visibleIndex`, `scrollToIndex`, `scrollPosition`, `estimatedItemSize`,
`cancelSeek`, the `item` slot. A swapped view must expose the same, and
naming that surface as `Chat.ScrollerContract` is the first thing the
conversion writes down.

### Configuration is a layer — a setting is a getter

`CodeBlock` reads its own props and nothing else. The layer that opens
its settings to the kit is a subclass, one getter per setting, the
entry's word first and `super` after:

```ts
// ConfiguredBlock.ts — the configuration layer over CodeBlock
class $ConfiguredBlock extends CodeBlock.$Class {
  override get cap(): number | null {
    return (this.props.kit?.props?.cap as number | null | undefined) ?? super.cap;
  }

  override get wrap(): boolean {
    return (this.props.kit?.props?.wrap as boolean | undefined) ?? super.wrap;
  }
}

export namespace ConfiguredBlock {
  export const $Class = Static($ConfiguredBlock);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
```

```ts
class $DenseChat extends Chat.$Class {
  static override get $kit() {
    return Kit.Class.resolve({
      ...super.$kit,
      Message: {
        ...super.$kit.Message,
        subkit: { Tool: { subkit: { CodeBlock: { namespace: ConfiguredBlock, props: { cap: 2_000 } } } } },
      },
    });
  }
}
```

The entry names the layer and turns the knob; every block under every
card reads `2_000`. What the rule buys, beyond one file:

- **Layers stack by inheritance.** A user-preference layer over an
  org-policy layer over `ConfiguredBlock` is three subclasses, each
  `mine ?? super`; precedence is inheritance order.
- **The source is the layer's choice.** The entry's `props` here; a
  settings store (`this.$settings.cap ?? super.cap`), a tenant record
  or an experiment bucket elsewhere, with the same getter shape.
- **Forcing a value is the same move.** `override get cap() { return 2_000 }`
  reaches past anything the parent passed. `props` on an entry is a
  consumer turning a knob a layer opened; a constant getter is a
  consumer reaching past the parent. Same shape, different left side.
- **A setting can compute.** Clamp, map, combine two sources, log the
  read — one more line in the same getter, where a generated opener
  would need a new option.

The scroller gets the same treatment when the chat wants to tune it:
a `ConfiguredScroller` layer over `VirtualScroller` opening
`assumedSize` and `paddingQuantity`, named in `Chat.$kit.Scroller`.

### A different code block under one tool

```ts
// TerminalChat.ts — stdout as a terminal emulation, only under Bash
import { Kit } from './Kit';
import { Chat } from './Chat';
import { TerminalBlock } from './TerminalBlock';
import TerminalBlockView from './TerminalBlock.vue';

class $TerminalChat extends Chat.$Class {
  static override get $kit() {
    return Kit.Class.resolve({
      ...super.$kit,
      Message: {
        ...super.$kit.Message,
        subkit: {
          Tool: {
            subkit: {
              Tools: {
                Bash: {
                  subkit: { CodeBlock: { namespace: TerminalBlock, vue: TerminalBlockView } },
                },
              },
            },
          },
        },
      },
    });
  }
}

export namespace TerminalChat {
  export const $Class = Static($TerminalChat);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
```

One class, one literal. The nesting is the path from the root to the
leaf — Message, Tool, Tools.Bash, CodeBlock — and every hop that says
only `subkit` keeps its model and view. `resolve` derives a
`ChatMessage` subclass whose kit names a derived `ToolCallModel`
subclass whose `Tools.Bash` names a derived `BashCall` subclass whose
`CodeBlock` is the terminal block; each derived class caches its own
kit; `TerminalChat.$kit` is built once. Reading the literal tells you
exactly which subtree differs from `Chat`, and nothing else can differ.

### The same code block under every tool

```ts
class $MonoChat extends Chat.$Class {
  static override get $kit() {
    const block = { CodeBlock: { namespace: MonoBlock, vue: MonoBlockView } };
    const tools = Chat.$Class.$kit.Message.namespace.Class.$kit.Tool.namespace.Class.$kit;
    return Kit.Class.resolve({
      ...super.$kit,
      Message: {
        ...super.$kit.Message,
        subkit: {
          Tool: {
            subkit: {
              ...block, // the base's own entry, read by any card that does not override
              Generic: { subkit: block },
              Mcp: { subkit: block },
              Task: { subkit: block },
              Tools: Object.fromEntries(Object.keys(tools.Tools).map((name) => [name, { subkit: block }])),
            },
          },
        },
      },
    });
  }
}
```

Every card is a class of its own, so every card is named — the map
comprehension is the honest form of "all of them". The alternative, a
card reading a leaf from anywhere but its own class, is what the design
forbids, and this is the price: one line per card, generated from the
base's map so a new tool is covered without editing this override.

### One tree never changes another

An override builds new objects all the way down: `merge` starts from a
spread of the base and recurses into maps and entries; `derive` makes a
new subclass and only reads `Base.$kit`. After `TerminalChat.$kit`
resolves, `Chat.$kit.Message.namespace` is still `ChatMessage`,
`ChatMessage.$kit.Tool.namespace` is still the base, and
`BashCall.$kit.CodeBlock.namespace` is still `CodeBlock`. Entries the
override did not touch are shared by reference between the two kits,
which is why a resolved kit is frozen: sharing is safe only when nothing
can write. The spec below pins both facts.

### A derived class widens its contract, and its view declares it

Props and emits in Vue are per component definition, never per
instance: `defineProps(X.Class.props)` and `defineEmits(X.Class.emits)`
are compiler markers that become fixed `props` and `emits` fields on
the compiled SFC object, evaluated once when the module loads, and the
compiler rejects a setup-scope reference in either. So a class derived
by `subkit` that adds a prop or an event knows about it, and the base
view does not.

`resolveEntry` closes that: a derived entry's view is
`Kit.Class.view(entry.vue, derived)`, a fresh component object with
the base view's `setup` and `render` and the derived class's `props`
and `emits`. The parent can pass the new prop and it arrives in
`props`; the child can emit the new event and Vue knows it. The base
`.vue` file is never touched, and a hand-written subclass with its own
SFC is rewrapped to the same thing it already declared.

```ts
// a subkit that widens CodeBlock's contract — the view follows without a file
class $ThemedBlock extends CodeBlock.$Class {
  static override get propsTypes() {
    return definePropTypes({ ...super.propsTypes, theme: { type: String as PropType<'mono' | 'paper'> } });
  }

  static override get propsDefaults(): ExtractPropDefaultTypes<typeof $ThemedBlock.propsTypes> {
    return { ...super.propsDefaults, theme: 'mono' };
  }

  static override get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }

  static override get emits() {
    return { ...super.emits, select: (code: string) => typeof code === 'string' };
  }

  get theme(): 'mono' | 'paper' {
    return this.props.theme;
  }
}
```

```ts
// the explicit form — in any kit literal, or for a standalone mount of the widened class over the base SFC
CodeBlock: { namespace: ThemedBlock, vue: Kit.Class.view(CodeBlockView, ThemedBlock) }

// the short form inside an override — `merge` rewraps the kept view over the named namespace
subkit: { Tool: { subkit: { CodeBlock: { namespace: ThemedBlock } } } }

// a subkit that DERIVES the class (no file) — `resolveEntry` rewraps the view over the derived namespace
subkit: { Tool: { subkit: { CodeBlock: { subkit: { … } } } } }
```

Three ways to arrive, one result: the entry's view declares the
entry's namespace's contract. `Kit.Class.vue` is the function; `merge`
calls it when a patch names a namespace and keeps the view; `resolveEntry`
calls it when a patch derives the namespace; a patch that brings its own
view is left alone, since that view declares what it declares. A section
view that renders code blocks may then pass `:theme="…"` and listen
`@select="…"`, and both are declared. Emits, in object form on
the contract as the standard already has them, need nothing else from
the kit: a listener attaches to the seam, so every swap keeps the
parent's handlers, and adding or removing one is a section swap, the
change a template owns.

Verified by `Kit.test.ts`: the rewrapped view carries every field the
compiled SFC had, `__scopeId` included, and a prop only the derived
class declares arrives through it while falling through the base view as
an attribute. Still open: a Vapor component object surviving the same
spread, since the design claims neutrality on that runtime.

### Slots are contract, not mechanism

A slot attaches to the seam the way a listener does: `<component :is>`
passes its slot content to whatever view the entry names, so a swap of
view or class keeps the parent's slot content with no work. In this
tree there is exactly one slot at a seam — the scroller's `#item`,
which the root fills with the message seam — and every other child
renders its own children from the model, because sections are roles.

So a slot is a line in a role's contract, beside its exposed surface
and its emits: the scroller's contract says "renders an `item` slot
with the element as its props", and a swapped scroller view must render
that slot under that name or the chat is blank. A consumer who wants
different slot content changes the template that provides it, which is
a section swap — the same answer as for a listener. Nothing in `Kit`
carries slot content, and a parent never passes slot content into a
role that did not name the slot.

### Styles follow class names, and a scope id travels with its view

The chat styles itself from one stylesheet, `ai-chat.css`, by class
name: `ac-msg`, `ac-tool`, `ac-code`. A view is styled because it
renders those names; a swapped view that keeps them is styled the same
and one that drops them is not, by intent, since it brings its own look.
The class names a role's view renders are therefore part of the role's
contract, and the base-kit HTML snapshot in the checklist pins them.

Scoped styles change none of this. A `<style scoped>` block applies to
the elements its own view renders, through the view's `__scopeId`; a
swapped view has its own scope and its own styles, as it should. The
one crossing Vue makes — a parent's scope id stamped on a child's root
element so the parent may style the child's root — is applied to
whatever component sits at the seam, so it survives a swap too. And
`Kit.Class.vue` spreads the compiled view, so a rewrapped view keeps
its `__scopeId` and its styles apply unchanged; that field is on the
verification list for exactly this reason.

### Where `derive` runs

`resolve` runs inside a static getter, so derived classes exist only
after the first read of the override's kit, and only for the overrides
that were read. A chat that never mounts `TerminalChat` never derives a
thing. The overlay ledger in `tasks/malleable-architecture.md` is the
same call made from data: a persisted patch, resolved against the
shipped class at load, is a derived class the app never had a file for.

### A section that rearranges its children

```vue
<!-- GroupedParts.vue — a Parts section that groups; markup only -->
<script setup lang="ts">
import type { Kit } from '../Kit';
import type { ChatMessage } from '../ChatMessage';

defineProps<{ kit: Kit.Entry; model: ChatMessage.Instance }>();
</script>

<template>
  <div class="ac-parts ac-parts-grouped">
    <component v-for="part in model.textParts" :is="model.partView(part)" :key="model.partKey(part, 0)" :kit="model.partEntry(part)" :part="part" :chat="model.chat" :message="model.message" />
    <details v-if="model.toolParts.length" class="ac-parts-tools">
      <summary>{{ model.toolParts.length }} tool calls</summary>
      <component v-for="part in model.toolParts" :is="model.partView(part)" :key="model.partKey(part, 0)" :kit="model.partEntry(part)" :part="part" :chat="model.chat" :message="model.message" />
    </details>
  </div>
</template>
```

```ts
class $GroupedChat extends Chat.$Class {
  static override get $kit() {
    return Kit.Class.resolve({
      ...super.$kit,
      Message: { ...super.$kit.Message, subkit: { Parts: { vue: GroupedPartsView } } },
    });
  }
}
```

The container receives `kit` and `model` like every section, and lays
the parts out its own way through the same `partView` and `partEntry`
the row uses, so every part still renders through the kit. `textParts` and
`toolParts` are two getters on the row model — the arrangement's logic
stays on the class, the container is markup.

### A row rendered somewhere else

```vue
<!-- an embed of one message, outside the chat: hand the row and a chat, get the same card -->
<component :is="Chat.$kit.Message.vue" :kit="Chat.$kit.Message" :row="row" :chat="chat" />
```

Any parent that holds a chat can render its rows with the chat's own
choices, because the kit is a static on a class the parent can import.
There is no context to be inside of.

### What a test does

```ts
it('resolves each kit from its own class, and a subclass swaps one entry', () => {
  expect(ChatMessage.Class.$kit.ToolBatch.namespace).toBe(ToolBatchPart);
  expect(ChatMessage.Class.PART_ROLES.tool_batch).toBe('ToolBatch');
  expect(ToolCallModel.Class.toolFor('Bash').namespace).toBe(BashCall);
  expect(ToolCallModel.Class.toolFor('mcp__x__y')).toBe(ToolCallModel.Class.$kit.Mcp);
  expect(ToolCallModel.Class.toolFor('Nobody')).toBe(ToolCallModel.Class.$kit.Generic);
  expect(FancyChat.Class.$kit.Scroller.namespace).toBe(SnapScroller);
  expect(FancyChat.Class.$kit.Message).toBe(Chat.Class.$kit.Message);
  expect(Chat.Class.$kit.Scroller.namespace).toBe(VirtualScroller);
});

it('an override never reaches another tree, and a kit is its own class\'s', () => {
  const terminal = TerminalChat.Class.$kit;
  expect(terminal.Message.namespace).not.toBe(ChatMessage);
  expect(terminal.Message.namespace.$Class.prototype).toBeInstanceOf(ChatMessage.$Class);
  expect(Chat.Class.$kit.Message.namespace).toBe(ChatMessage);
  expect(ChatMessage.Class.$kit.Tool.namespace).toBe(ToolCallModel);
  expect(BashCall.Class.$kit.CodeBlock.namespace).toBe(CodeBlock);
  expect(terminal.Composer).toBe(Chat.Class.$kit.Composer); // untouched entries are shared, and frozen
  expect(Object.isFrozen(terminal.Composer)).toBe(true);
  expect(Object.isFrozen(terminal.Composer.vue)).toBe(false); // the freeze stops at the entry's leaves
  expect(Object.isFrozen(terminal.Composer.namespace)).toBe(false);
  expect(Chat.Class.$kit).not.toBe(FancyChat.Class.$kit); // the cache is keyed by the asking class
  expect(FancyChat.Class.$kit).toBe(FancyChat.Class.$kit);
});

it('a view constructs the class it is handed', async () => {
  const wrapper = mount(ChatMessageView, { props: { row, chat, kit: { namespace: TerminalMessage, vue: ChatMessageView } } });
  expect(wrapper.vm.model).toBeInstanceOf(TerminalMessage.Class);
});

it('a tunable reads the kit first, an extension reads only the kit, a closed prop never reads it', () => {
  const entry = DenseChat.Class.$kit.Message.namespace.Class.$kit.Tool.namespace.Class.$kit.CodeBlock;
  expect(entry.namespace).toBe(CodeBlock); // props alone derive nothing
  expect(entry.props).toEqual({ cap: 2_000 });
  expect(new CodeBlock.Class({ code: 'a', cap: 100, kit: entry }).cap).toBe(2_000);
  expect(new CodeBlock.Class({ code: 'a', cap: 100 }).cap).toBe(100);
  expect(new CodeBlock.Class({ code: 'a', kit: { vue: CodeBlockView, props: { theme: 'mono' } } }).theme).toBe('mono');
  expect(new CodeBlock.Class({ code: 'a', kit: { vue: CodeBlockView, props: { code: 'b' } } }).code).toBe('a');
  expect(new CappedBlock.Class({ code: 'a', cap: 100 }).cap).toBe(2_000); // the getter override reaches past the contract
});
```

## The mapping

| today | after |
| --- | --- |
| `parts/Parts.ts` registry (kind → component) | `ChatMessage.$kit` keyed by PascalCase role (`Text`, `ToolBatch`…), `PART_ROLES` mapping kind → role; the row model resolves `partEntry(part)`, `Text` as the fallback |
| `tools/Tools.ts` registry (name → component, prefix families, generic fallback) | `ToolCallModel.$kit.Tools` plus `Mcp`, `Task`, `Generic` entries; the lookup is the static `toolFor(name)` on the base |
| `ToolHead.vue`, `ToolFoot.vue`, `CodeBlock.vue` used by name in every card | `ToolCallModel.$kit`: `Head`, `Foot` as markup leaves, `CodeBlock` as a pair; cards render `<component :is="model.kit.Head.vue" :model="model" />` and `<component :is="model.kit.CodeBlock.vue" :kit="model.kit.CodeBlock" …props />` |
| `Chat.ts` reaches the scroller through `ref="scroller"` | unchanged: the scroller's view constructs the class its entry names and exposes it; the chat keeps its template ref. The entry `Chat.$kit.Scroller = { namespace: VirtualScroller, vue: VirtualScrollerView }` is what a page overrides to put a different scroller under the chat |
| `ChatComposer.vue`, `ChatIndex.vue` construct their models | unchanged in who constructs; each news `props.kit?.namespace.Class ?? Composer.Class` and is rendered through `chat.kit.Composer` |
| `ChatMessage.vue` constructs a row model per row in the scroller's slot | unchanged; the slot renders `<component :is="chat.kit.Message.vue" :kit="chat.kit.Message" :row="item" :chat="chat" />` |
| `SubThread.vue` constructs | unchanged; a nested thread renders rows through the same entry |

Every current test keeps its subject: the classes' logic does not move,
and nobody's constructor moves. What changes is that a view names its
role's entry instead of a class and a component, and that the views stop
importing each other.

## Friction to learn from (the reason the chat goes first)

- **The scroller is the one child outside the folder.** It stays as it
  is — its view constructs and exposes its model — and enters the kit
  as an entry. The friction is only that a swapped scroller view must
  expose the same surface the chat reads (`visibleIndex`,
  `scrollToIndex`, `scrollPosition`, `estimatedItemSize`), which is the
  argument for naming that surface as the role's contract.
- **A view constructing the class it was handed** is the one new line
  in every vue: `new (props.kit?.namespace.Class ?? Default.Class)(props)`.
  Check that a view mounted with no `kit` prop (a docs demo, a spec)
  still constructs the default, and that the gate's "one `new` in
  setup" reading accepts the indirection.
- **Every chat class moves onto the static props contract.** Today the
  folder declares type-only `Props` interfaces; the build gives each
  class `propsTypes`, `propsDefaults` and `props`, declares its own
  `kit` prop typed to itself, and keeps the standard's `nestedProps`
  line as it is. This is the larger half of the conversion by line
  count. An entry's `props` cost nothing here: they are read by the
  getters an author chooses to open.
- **Two things called kit.** A model's `kit` is its class's `$kit`, the
  roles below it; a view's `props.kit` is the entry it was rendered
  through, one role from above. The same word for two neighbours on
  one seam is deliberate — a view hands its entry's model the roles
  that model then hands down — but if it reads wrong at conversion,
  the prop is renamed `entry` once, everywhere, and nothing else moves.
- **A setting is a getter, and the base is closed.** No class in the
  chat reads the kit's props directly; a `Configured…` layer over it
  does, one `?? super` getter per setting (`ConfiguredBlock` for `cap`
  and `wrap`, `ConfiguredScroller` for the sizes), and the kit names the
  layer. No engine change: `nestedProps`, `this.props` and Vue's props
  object are exactly what they are today.
- **The scroller's `kit` prop.** `VirtualScroller.ts` spreads
  a `kit` prop into the contract it already has; every existing use
  is untouched.
- **A deep swap is one literal, resolved once.** An override's entry
  may carry `subkit`, a patch over the child's own kit; `Kit.Class.resolve`
  turns every reach into a derived class at kit build time, cached per
  class by `Static()`'s own `$`-getter guard. A class's own `$kit` never
  carries `subkit`. Verified by `Kit.test.ts` (2026-09-10): `Reactive`
  over a subclass of an already-transformed class leaves inherited
  members alone — cells cached, methods bound, `self` reading the derived
  statics — and a derived class's `$kit` is its own. `Kit.Class.vue`
  carries every field the compiled SFC had, `__scopeId` included, under
  Vue 3.5; a Vapor component object is not yet exercised.
- **Sections as roles.** Each section is one component instance per
  visible row — six for a row, the same order as the tool cards already
  cost, a dozen rows deep in the window. Measured in the mount-cost line
  of the checklist; the row rendered in the base kit must produce the
  same element tags and classes as today. A section that grows state
  gets a namespace on its entry and its own class, and then it is a
  role like the rest — the seam does not change.
- **The generic fallback is a kit entry**, not a branch: `toolFor(name)`
  returns `kit.Tools[name] ?? kit.Tools.byPrefix(name) ?? kit.Tools.Generic`.
  The rule "rendering never branches on a name" survives; the lookup
  just moved onto the model.

## Verification checklist

- [ ] `npx vitest run examples/playground/src/examples/ai-chat`: every
      existing spec passes with its subject unchanged; no spec imports a
      `.vue` file except the kit-resolution spec.
- [ ] A spec constructs `ChatMessage` and a subclass with an overridden
      `$kit` and asserts resolution: each reads its own static;
      `toolFor` falls back to `Generic`; a view handed the subclass as
      `model` constructs the subclass.
- [ ] A subclass `FancyChat` overriding one entry of `$kit` (`Scroller`)
      renders the chat with the other scroller view and nothing else
      changed — the playground gets a second route to show it.
- [ ] A root-kit override of `CodeBlock` reaches every tool card without
      touching any tool class.
- [ ] Sections: the base kit renders the row with the same element tags
      and classes as today (snapshot the row's outer HTML before and
      after); a `Head` swapped for a two-column SFC with its own class
      shows the same labels, and `GroupedChat` renders tool calls under
      a `details`.
- [ ] The scroller changes by one optional prop: its suite, the
      horizontal scroller and the text marquee pass unchanged; the chat
      reaches it through the kit's `Scroller` entry and the same template
      ref as before.
- [ ] Every chat class declares `propsTypes`, `propsDefaults`, `props`
      with a `kit` prop typed to the class; every view is `defineProps(X.Class.props)`;
      the gate's contract checks pass on the folder.
- [ ] A derived class that widens its contract renders through a view
      that declares it: `ThemedBlock` receives `:theme` in `props` and
      emits `select` with no dev warning; the base `CodeBlockView`
      object is unchanged and `Chat.$kit` still names it.
- [ ] A props-carrying entry reaches the getters that open to it:
      `DenseChat` renders every code block at the entry's `cap` whatever
      the cards pass, and `CappedBlock` forces it where the author did not
      open it; a prop no getter opens is unchanged by the entry.
- [ ] The browser drives from the plan (`tasks/ai-chat-scroller-plan.md`)
      pass unchanged: pages on demand, tool cards, index selection,
      streaming, the twelve-glide anchor drive at zero jerks.
- [ ] The gate adds no findings; the invariants checker binds the new
      "rendering is a kit" record; `npm run build:docs` passes.
- [ ] Bundle and mount cost measured before and after: the kit adds a
      lazy static per class and one prop per child, nothing per render.

## Impossibilities (what this build forbids)

- A template that names a component it composes.
- A parent that constructs a child's model.
- A view that constructs anything but its entry's namespace `Class`.
- A model that names its own view, or reads a kit that is not its own class's.
- A swap, or a configuration a view already exposes as a prop, that needs a model class or a view edited.
- Anything but the one entry passed down for the kit's sake.
- A shell component between a parent and its child's view.
- A seam with any shape but `:is` from the entry, `:kit` the entry, then props.
- A section of a view that is not a role, or a section that cannot reach the model it belongs to.
- An entry whose view declares a different contract than its namespace.
- A listener attached anywhere but the seam, or slot content passed into a role whose contract names no such slot.
- A view styled by anything but the class names its role's contract lists, or a rewrapped view that lost its scope id.
- A setting reached by anything but a getter, or a base class that reads the kit's props when a layer could.

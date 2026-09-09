# The AI chat on the kit — the first malleable tree

Convert `examples/playground/src/examples/ai-chat/` from its two
registries (`Parts`, `Tools`) to the kit design settled on 2026-09-09:
every model carries `static get $kit`, a template names roles and never
components, a parent hands a child its kit ENTRY as the one prop the
kit adds, and every view constructs the class the entry names over the
props the entry sets. The design
itself is recorded in `tasks/malleable-architecture.md` under "The kit";
this file is the build.

Status: designed, not started. Trigger: the first time a second view of
any chat model is wanted (a different scroller for the chat only, a
different code block for one page, an embed of the thread elsewhere) —
or the moment the standard is ready to take the kit rule and needs a
shipped instance to point at.

## The design, in the chat's terms

- **`static get $kit()` on every model that composes.** A lazy static
  getter, cached per class, returning the roles that model's subtree
  needs as `{ model, view }` pairs (a role with its own model) or `{ view }`
  (a leaf that takes props). Lazy is what makes the model↔view import
  cycle harmless: nothing reads the other side at module init. A
  subclass extends by spread: `{ ...super.$kit, Scroller: { … } }`.
- **The entry crosses the seam.** A parent renders
  `<component :is="chat.kit.Message.view" :kit="chat.kit.Message" :row="item" :chat="chat" />`:
  the entry's view, the entry itself as the one prop `kit`, the child's
  own props. An entry is `{ view, model?, props?, subkit? }` — the
  view, the class the view constructs, props the consumer set for the
  role, and a patch for the child's own kit. No inject. The child's
  model reads its kit from its own class — `get kit() { return this.self.$kit }`
  — so a swapped class brings its own kit, and no parent ever
  constructs a child.
- **Every view constructs the class it was handed.** The SFC is the
  wiring: `defineProps(ChatMessage.Class.props)`, one `new`, the
  destructure. The one line the kit adds is
  `new (props.kit?.model ?? ChatMessage.Class)(props)`; the fallback is
  for a view mounted on its own (a docs demo, a spec). Lifecycle hooks
  in the constructor bind to the view's own component, exactly as today.
- **Props live on the class contract.** Every chat class moves from a
  type-only `Props` interface to the standard's statics — `propsTypes`,
  `propsDefaults`, `props` — and spreads `Kit.propsTypes` in for the
  entry. An entry's `props` then needs no mechanism of its own:
  `Kit.resolve` derives a class whose `propsDefaults` lay the entry's
  values over the base's, and the constructor fills omitted props from
  `this.self.propsDefaults` as the standard already says. Kit props are
  defaults: they apply where the template omitted the prop, and a card
  that passes `:cap` keeps its value.
- **Override is subclassing.** A subclass with a spread `$kit` swaps a
  role: `FancyChat.$kit.Scroller = { model: SnapScroller.Class, view: SnapScrollerView }`.
  A swap that must reach a deep leaf is the same spread with an optional
  `subkit` on the entry — a patch over the child's own kit — which
  `Kit.resolve` turns into derived subclasses once, at kit build time.
  One literal names the path from the root to the leaf; a class's own
  `$kit` never carries `subkit`.
- **Templates name roles.** Every child, leaf or not, renders through
  `<component :is="model.kit.Role.view" …>`; a leaf that has no model of
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

```ts
import type { Component } from 'vue';
import { Reactive } from '../../ivue';

// An entry names a role's view and, when the role has a model of its own,
// the class that view constructs. `subkit` is optional and appears only
// in an override: a patch over the model's own $kit, applied when the kit
// resolves. A kit is a record of entries or of nested records of entries.
export namespace Kit {
  export interface Entry<Model = unknown> {
    view: Component;
    model?: Model;
    /** optional: prop defaults for this role — laid over the model's `propsDefaults` when the kit resolves */
    props?: Record<string, unknown>;
    subkit?: Patch;
  }

  /** a patch is a kit whose every field is optional; `{ subkit }` alone keeps model and view */
  export type Patch = { [role: string]: Partial<Entry> | Patch };

  export type Of<Roles extends string> = Record<Roles, Entry>;

  /** the one prop every kit-rendered class adds to its `propsTypes`: the entry it was rendered through */
  export const propsTypes = definePropTypes({
    kit: { type: Object as PropType<Entry> },
  });

  const cache = new WeakMap<Function, object>();

  /** one kit per class that asks — keyed by the class, so a subclass never reads its parent's */
  export function cached<K extends object>(owner: Function, build: () => K): K {
    let kit = cache.get(owner) as K | undefined;
    if (!kit) {
      kit = deepFreeze(build());
      cache.set(owner, kit);
    }
    return kit;
  }

  /** a resolved kit is shared by reference between trees and must never be written */
  function deepFreeze<K extends object>(value: K): K {
    for (const inner of Object.values(value)) {
      if (typeof inner === 'object' && inner !== null && !Object.isFrozen(inner) && !isClass(inner)) deepFreeze(inner);
    }
    return Object.freeze(value);
  }

  function isClass(value: object): boolean {
    return typeof value === 'function';
  }

  /** every entry with a subkit becomes an entry whose model is a derived class */
  export function resolve<K extends object>(kit: K): K {
    return Object.fromEntries(
      Object.entries(kit).map(([role, value]) => [role, isEntry(value) ? resolveEntry(value) : resolve(value as object)]),
    ) as K;
  }

  /** a subclass of `Base`: its `$kit` is `Base.$kit` deep-merged with `patch` and resolved;
   *  its `propsDefaults` are `Base.propsDefaults` with `defaults` laid over them */
  export function derive(Base: any, patch: Patch = {}, defaults: Record<string, unknown> = {}) {
    return Reactive(
      class extends Base {
        static get $kit() {
          return cached(this, () => resolve(merge(Base.$kit, patch)));
        }

        static get propsDefaults() {
          return { ...Base.propsDefaults, ...defaults };
        }
      },
    );
  }

  /** an entry with a subkit or props becomes an entry whose model is a derived class; the fields are consumed */
  function resolveEntry(entry: Entry): Entry {
    if (!entry.model || (!entry.subkit && !entry.props)) return entry;
    const { subkit, props, ...rest } = entry;
    return { ...rest, model: derive(entry.model, subkit, props) };
  }

  function merge(base: any, patch: Patch): any {
    const out = { ...base };
    for (const [role, value] of Object.entries(patch)) {
      const current = base[role];
      out[role] = isEntry(current) || isEntry(value) ? { ...current, ...value } : merge(current ?? {}, value as Patch);
    }
    return out;
  }

  function isEntry(value: unknown): value is Entry {
    return typeof value === 'object' && value !== null && ('view' in value || 'model' in value || 'subkit' in value);
  }
}
```

A class's own `$kit` is written plain, with no `subkit` or `props`
anywhere; it needs no `resolve`. Both fields belong to overrides, where
a patch names how deep it reaches and what it tunes, and the resolver
turns each into a derived class once, cached on the class that asked.
An entry's `props` is sugar for a `propsDefaults` override on that
derived class: the standard's own mechanism, and nothing at the view.
`Kit.propsTypes` is the one prop a kit-rendered class spreads into its
`propsTypes`, so the entry arrives through the same contract as every
other prop.

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
    return Kit.cached(this, () => ({
      Scroller: { model: VirtualScroller.Class, view: VirtualScrollerView },
      Message: { model: ChatMessage.Class, view: ChatMessageView },
      Composer: { model: Composer.Class, view: ChatComposerView },
      Index: { model: Index.Class, view: ChatIndexView },
    }) satisfies Kit.Of<'Scroller' | 'Message' | 'Composer' | 'Index'>);
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

A static getter re-runs on every read, so the kit is cached — by the
class that asked, in a `WeakMap`, never in a static field. A static
field read through `this` resolves up the static prototype chain, so a
subclass that had not built its own yet would find and return its
parent's kit. `Kit.cached(this, …)` is what keeps every class's kit its
own.

### `AiChatExample.vue` — the root template names roles

```vue
<script setup lang="ts">
import { Chat } from './Chat';
import './ai-chat.css';

const props = defineProps<{ dark?: boolean } & Kit.Rendered<typeof Chat.Class>>();

// the root constructs the class it was handed, or its own
const chat = new (props.kit?.model ?? Chat.Class)();

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
          :is="chat.kit.Scroller.view"
          ref="scroller"
          :kit="chat.kit.Scroller"
          scrollbar
          v-model="rows"
          :assumed-size="96"
          :padding-quantity="6"
          :selection-text="chat.rowText"
        >
          <template #item="{ item }">
            <component :is="chat.kit.Message.view" :kit="chat.kit.Message" :row="item" :chat="chat" />
          </template>
        </component>
        <button v-if="chat.showsJumpToLatest" type="button" class="ac-jump" @click="chat.jumpToLatest()">↓ latest</button>
      </section>
      <component :is="chat.kit.Index.view" v-if="indexOpen" :kit="chat.kit.Index" :chat="chat" />
    </div>

    <component :is="chat.kit.Composer.view" :kit="chat.kit.Composer" :chat="chat" />
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
import { ToolBatchPart } from './parts/ToolBatchPart';
import { ToolCallModel } from './tools/ToolCallModel';

class $ChatMessage {
  static get $kit() {
    return Kit.cached(this, () => ({
      // parts by kind — the registry `Parts.ts` was, as entries
      text: { view: TextPartView },
      thinking: { view: ThinkingPartView },
      attachment: { view: AttachmentPartView },
      system: { view: SystemPartView },
      tool_call: { view: ToolCallPartView },
      tool_batch: { model: ToolBatchPart.Class, view: ToolBatchPartView },
      // the tool cards are reached through the tool base's kit, one hop down
      Tool: { model: ToolCallModel.Class, view: ToolCallPartView },
    }) satisfies Kit.Of<SessionLog.Part['kind'] | 'Tool'>);
  }

  constructor(public props: ChatMessage.Props) {}

  protected get self() {
    return this.constructor as typeof $ChatMessage;
  }

  get kit() {
    return this.self.$kit;
  }

  /** a kind the kit does not name renders as text — the registry's old fallback */
  partEntry(part: SessionLog.Part): Kit.Entry {
    return this.kit[part.kind] ?? this.kit.text;
  }

  partView(part: SessionLog.Part) {
    return this.partEntry(part).view;
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
    kit?: Kit.Entry<typeof Class>;
  }
  // …in the build, this interface becomes `ExtractPropTypes<typeof $Class.props>` over a static
  // contract — `propsTypes` with `row`, `chat` required and `...Kit.propsTypes`; see CodeBlock below.

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

const model = new (props.kit?.model ?? ChatMessage.Class)(props);
</script>

<template>
  <article class="ac-msg" :class="model.rowClass">
    …header and stub unchanged…
    <div v-else class="ac-parts">
      <component
        :is="model.partView(part)"
        v-for="(part, at) in model.parts"
        :key="model.partKey(part, at)"
        :kit="model.partEntry(part)"
        :part="part"
        :chat="chat"
        :message="model.message"
      />
    </div>
  </article>
</template>
```

`Parts.ts` is deleted. A leaf part (text, thinking) receives an entry
with no model and constructs its own small class as today. `tool_batch`
has a model and constructs the one it is handed.

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
    return Kit.cached(this, () => ({
      Head: { view: ToolHeadView },
      Foot: { view: ToolFootView },
      CodeBlock: { model: CodeBlock.Class, view: CodeBlockView },
      Generic: { model: ToolCallModel.Class, view: GenericCallView },
      Mcp: { model: McpCall.Class, view: McpCallView },
      Task: { model: TaskCall.Class, view: TaskCallView },
      Tools: {
        Bash: { model: BashCall.Class, view: BashCallView },
        Edit: { model: EditCall.Class, view: EditCallView },
        NotebookEdit: { model: EditCall.Class, view: EditCallView },
        Read: { model: ReadCall.Class, view: ReadCallView },
        Write: { model: WriteCall.Class, view: WriteCallView },
        Agent: { model: AgentCall.Class, view: AgentCallView },
        Skill: { model: SkillCall.Class, view: SkillCallView },
        WebFetch: { model: WebFetchCall.Class, view: WebFetchCallView },
        WebSearch: { model: WebFetchCall.Class, view: WebFetchCallView },
        Artifact: { model: ArtifactCall.Class, view: ArtifactCallView },
      } as Record<string, Kit.Entry>,
    }));
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
    kit?: Kit.Entry<typeof Class>;
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
const props = defineProps(ToolCallPart.Class.props); // part, chat, message, and ...Kit.propsTypes

const base = props.kit?.model ?? ToolCallModel.Class;
</script>

<template>
  <component
    :is="base.toolFor(part.call.name).view"
    :kit="base.toolFor(part.call.name)"
    :call="part.call"
    :chat="chat"
    :message="message"
  />
</template>
```

This leaf is the one place a template calls a method twice for one
element. If the gate objects, the part becomes a two-line class with a
`card` getter and the template reads `model.card.view` and
`model.card.model`; the shape is the same.

### `BashCall.vue` — a card renders its leaves through the base's kit

```vue
<script setup lang="ts">
import { BashCall } from './BashCall';
import type { ToolCallModel } from './ToolCallModel';

const props = defineProps(BashCall.Class.props);

const model = new (props.kit?.model ?? BashCall.Class)(props);
</script>

<template>
  <div class="ac-tool ac-tool-bash" :class="model.cardClass">
    <component :is="model.kit.Head.view" :model="model" />
    <div v-if="model.isExpanded" class="ac-tool-body">
      <p v-if="model.description" class="ac-tool-caption">{{ model.description }}</p>
      <section class="ac-tool-section">
        <h5>command <span v-if="model.ranInBackground" class="ac-tag">background</span></h5>
        <component :is="model.kit.CodeBlock.view" :kit="model.kit.CodeBlock" :code="model.command" lang="bash" :cap="model.cap" wrap />
      </section>
      <section v-if="model.hasStdout" class="ac-tool-section">
        <h5>stdout <span class="ac-tag" :class="model.stateClass">{{ model.exitLabel }}</span></h5>
        <component :is="model.kit.CodeBlock.view" :kit="model.kit.CodeBlock" :code="model.stdout" lang="text" :cap="model.cap" wrap />
      </section>
      <component :is="model.kit.Foot.view" :model="model" />
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
      ...Kit.propsTypes,
    });
  }

  static get propsDefaults(): ExtractPropDefaultTypes<typeof $CodeBlock.propsTypes> {
    return { lang: 'text', cap: null, wrap: false, tone: 'plain', startLine: 1, kit: undefined };
  }

  static get props() {
    return propsWithDefaults(this.propsDefaults, this.propsTypes);
  }

  constructor(public props: CodeBlock.Props) {
    // fills what the template omitted from THIS class's defaults — a derived class's included
    nestedProps(props, this.self.propsDefaults);
    onMounted(() => this.colour());
    // …
  }

  protected get self() {
    return this.constructor as typeof $CodeBlock;
  }

  get lang(): string {
    return this.props.lang;
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

const model = new (props.kit?.model ?? CodeBlock.Class)(props);
</script>

<template>
  <div class="ac-code" :class="model.blockClass" :style="model.blockStyle" v-html="model.renderedHtml"></div>
</template>
```

When a consumer's kit says `CodeBlock: { …, props: { cap: 2_000 } }`,
`Kit.resolve` derives a `CodeBlock` subclass whose `propsDefaults` are
the base's with `cap: 2_000` laid over, and the entry's `model` becomes
that class. The view constructs it; the constructor's `nestedProps`
fills `cap` from the derived defaults wherever the card left `:cap`
off. Vue's own defaults, compiled from `CodeBlock.Class.props`, still
run at the boundary for the base contract; the derived class's defaults
run in the constructor. No proxy, no second props mechanism — the
standard's contract is the only one.

### `VirtualScroller.vue` — one optional prop, everything else untouched

```ts
// VirtualScroller.ts — one spread in the contract it already has
static get propsTypes() {
  return definePropTypes({ ...super.propsTypes /* the existing map */, ...Kit.propsTypes });
}

// VirtualScroller.vue — the one line that changes
const virtualScroller = new (props.kit?.model ?? VirtualScroller.Class)<T>(props, emit);
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
    return Kit.cached(this, () => ({
      ...super.$kit,
      Scroller: { model: SnapScroller.Class, view: SnapScrollerView },
    }));
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
<AiChatExample :kit="{ model: FancyChat.Class, view: AiChatExample }" />
```

The scroller's contract with the chat is the surface `Chat` reads:
`visibleIndex`, `scrollToIndex`, `scrollPosition`, `estimatedItemSize`,
`cancelSeek`, the `item` slot. A swapped view must expose the same, and
naming that surface as `Chat.ScrollerContract` is the first thing the
conversion writes down.

### Configuration without a subclass — props on an entry

```ts
class $DenseChat extends Chat.$Class {
  static override get $kit() {
    return Kit.cached(this, () => Kit.resolve({
      ...super.$kit,
      // the same scroller, tuned: the entry's props are the derived class's defaults
      Scroller: { ...super.$kit.Scroller, props: { assumedSize: 64, paddingQuantity: 10 } },
      // every code block under every card capped lower, no class touched
      Message: {
        ...super.$kit.Message,
        subkit: { Tool: { subkit: { CodeBlock: { props: { cap: 2_000 } } } } },
      },
    }));
  }
}
```

A patch entry may carry only `props`; `merge` lays it over the base
entry, so model and view are kept, and `resolve` derives a class whose
`propsDefaults` carry the values. These are defaults: `assumedSize`
applies because the root template stops passing `:assumed-size` once
the role is tuned from the kit, and `cap` applies wherever a card left
`:cap` off. A consumer who needs to force a value past a template that
sets it derives the class and overrides the prop getter — the ordinary
move, not a kit feature. This is the consumer's dial for anything a
view already exposes as a prop, and it is why the class alone was not
enough to hand down: the entry is the unit of override, and props are
one of its three axes.

### A different code block under one tool

```ts
// TerminalChat.ts — stdout as a terminal emulation, only under Bash
import { Kit } from './Kit';
import { Chat } from './Chat';
import { TerminalBlock } from './TerminalBlock';
import TerminalBlockView from './TerminalBlock.vue';

class $TerminalChat extends Chat.$Class {
  static override get $kit() {
    return Kit.cached(this, () => Kit.resolve({
      ...super.$kit,
      Message: {
        ...super.$kit.Message,
        subkit: {
          Tool: {
            subkit: {
              Tools: {
                Bash: {
                  subkit: { CodeBlock: { model: TerminalBlock.Class, view: TerminalBlockView } },
                },
              },
            },
          },
        },
      },
    }));
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
    const block = { CodeBlock: { model: MonoBlock.Class, view: MonoBlockView } };
    const tools = Chat.$Class.$kit.Message.model.$kit.Tool.model.$kit;
    return Kit.cached(this, () => Kit.resolve({
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
    }));
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
resolves, `Chat.$kit.Message.model` is still `ChatMessage.Class`,
`ChatMessage.$kit.Tool.model` is still the base, and
`BashCall.$kit.CodeBlock.model` is still `CodeBlock.Class`. Entries the
override did not touch are shared by reference between the two kits,
which is why a resolved kit is frozen: sharing is safe only when nothing
can write. The spec below pins both facts.

### Where `derive` runs

`resolve` runs inside a static getter, so derived classes exist only
after the first read of the override's kit, and only for the overrides
that were read. A chat that never mounts `TerminalChat` never derives a
thing. The overlay ledger in `tasks/malleable-architecture.md` is the
same call made from data: a persisted patch, resolved against the
shipped class at load, is a derived class the app never had a file for.

### A row rendered somewhere else

```vue
<!-- an embed of one message, outside the chat: hand the row and a chat, get the same card -->
<component :is="Chat.$kit.Message.view" :kit="Chat.$kit.Message" :row="row" :chat="chat" />
```

Any parent that holds a chat can render its rows with the chat's own
choices, because the kit is a static on a class the parent can import.
There is no context to be inside of.

### What a test does

```ts
it('resolves each kit from its own class, and a subclass swaps one entry', () => {
  expect(ChatMessage.Class.$kit.tool_batch.model).toBe(ToolBatchPart.Class);
  expect(ToolCallModel.Class.toolFor('Bash').model).toBe(BashCall.Class);
  expect(ToolCallModel.Class.toolFor('mcp__x__y')).toBe(ToolCallModel.Class.$kit.Mcp);
  expect(ToolCallModel.Class.toolFor('Nobody')).toBe(ToolCallModel.Class.$kit.Generic);
  expect(FancyChat.Class.$kit.Scroller.model).toBe(SnapScroller.Class);
  expect(FancyChat.Class.$kit.Message).toBe(Chat.Class.$kit.Message);
  expect(Chat.Class.$kit.Scroller.model).toBe(VirtualScroller.Class);
});

it('an override never reaches another tree, and a kit is its own class\'s', () => {
  const terminal = TerminalChat.Class.$kit;
  expect(terminal.Message.model).not.toBe(ChatMessage.Class);
  expect(Chat.Class.$kit.Message.model).toBe(ChatMessage.Class);
  expect(ChatMessage.Class.$kit.Tool.model).toBe(ToolCallModel.Class);
  expect(BashCall.Class.$kit.CodeBlock.model).toBe(CodeBlock.Class);
  expect(terminal.Composer).toBe(Chat.Class.$kit.Composer); // untouched entries are shared, and frozen
  expect(Object.isFrozen(terminal.Composer)).toBe(true);
  expect(Chat.Class.$kit).not.toBe(FancyChat.Class.$kit); // the cache is keyed by the asking class
  expect(FancyChat.Class.$kit).toBe(FancyChat.Class.$kit);
});

it('a view constructs the class it is handed', async () => {
  const wrapper = mount(ChatMessageView, { props: { row, chat, kit: { model: TerminalMessage.Class, view: ChatMessageView } } });
  expect(wrapper.vm.model).toBeInstanceOf(TerminalMessage.Class);
});

it('an entry\'s props become the derived class\'s defaults, and the template still wins where it speaks', () => {
  const Derived = DenseChat.Class.$kit.Message.model.$kit.Tool.model.$kit.CodeBlock.model;
  expect(Derived).not.toBe(CodeBlock.Class);
  expect(Derived.propsDefaults.cap).toBe(2_000);
  expect(CodeBlock.Class.propsDefaults.cap).toBeNull();
  expect(new Derived({ code: 'a' }).props.cap).toBe(2_000);
  expect(new Derived({ code: 'a', cap: 100 }).props.cap).toBe(100);
});
```

## The mapping

| today | after |
| --- | --- |
| `parts/Parts.ts` registry (kind → component) | `ChatMessage.$kit` keyed by part kind; the row model resolves `partEntry(part)`, text as the fallback |
| `tools/Tools.ts` registry (name → component, prefix families, generic fallback) | `ToolCallModel.$kit.Tools` plus `Mcp`, `Task`, `Generic` entries; the lookup is the static `toolFor(name)` on the base |
| `ToolHead.vue`, `ToolFoot.vue`, `CodeBlock.vue` used by name in every card | `ToolCallModel.$kit`: `Head`, `Foot` as markup leaves, `CodeBlock` as a pair; cards render `<component :is="model.kit.Head.view" :model="model" />` and `<component :is="model.kit.CodeBlock.view" :kit="model.kit.CodeBlock" …props />` |
| `Chat.ts` reaches the scroller through `ref="scroller"` | unchanged: the scroller's view constructs the class its entry names and exposes it; the chat keeps its template ref. The entry `Chat.$kit.Scroller = { model: VirtualScroller.Class, view: VirtualScrollerView }` is what a page overrides to put a different scroller under the chat |
| `ChatComposer.vue`, `ChatIndex.vue` construct their models | unchanged in who constructs; each news `props.kit?.model ?? Composer.Class` and is rendered through `chat.kit.Composer` |
| `ChatMessage.vue` constructs a row model per row in the scroller's slot | unchanged; the slot renders `<component :is="chat.kit.Message.view" :kit="chat.kit.Message" :row="item" :chat="chat" />` |
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
  in every view: `new (props.kit?.model ?? Default.Class)(props)`.
  Check that a view mounted with no `kit` prop (a docs demo, a spec)
  still constructs the default, and that the gate's "one `new` in
  setup" reading accepts the indirection.
- **Every chat class moves onto the static props contract.** Today the
  folder declares type-only `Props` interfaces; the build gives each
  class `propsTypes`, `propsDefaults` and `props`, spreads
  `Kit.propsTypes` in, and fills omitted props in the constructor with
  `nestedProps`. This is the larger half of the conversion by line
  count and it is what makes an entry's `props` free: a derived class
  overriding `propsDefaults` is the standard's own move.
- **Two things called kit.** A model's `kit` is its class's `$kit`, the
  roles below it; a view's `props.kit` is the entry it was rendered
  through, one role from above. The same word for two neighbours on
  one seam is deliberate — a view hands its entry's model the roles
  that model then hands down — but if it reads wrong at conversion,
  the prop is renamed `entry` once, everywhere, and nothing else moves.
- **Two layers of defaults.** Vue applies the base contract's defaults
  at the boundary, from `X.Class.props` compiled into the view; a
  derived class's defaults apply in the constructor through
  `nestedProps`. A prop with a non-`undefined` base default is therefore
  never "omitted" by the time the constructor runs, and an entry's
  value for it would not apply. The ruling: a prop a kit may tune has
  `undefined` as its base default and the class resolves the fallback
  in its getter — `cap` and `assumedSize` are declared that way — or
  the view declares `defineProps(X.Class.propsTypes)` and leaves every
  default to the constructor. Decide once at conversion; the spec pins
  whichever it is.
- **The scroller's `kit` prop.** `VirtualScroller.ts` spreads
  `Kit.propsTypes` into the contract it already has; every existing use
  is untouched.
- **A deep swap is one literal, resolved once.** An override's entry
  may carry `subkit`, a patch over the child's own kit; `Kit.resolve`
  turns every reach into a derived class at kit build time, cached per
  class. A class's own `$kit` never carries `subkit`. The cache is a
  `WeakMap` keyed by the asking class, never a static field — a static
  field read through `this` walks the static chain and hands a subclass
  its parent's kit. Verify at conversion: `Reactive` over a subclass of an already-transformed class
  leaves inherited members alone (the engine's repeated-call guard says
  it does), and `Kit.cached` keyed by a derived anonymous class stays
  distinct from its base's entry.
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
- [ ] The scroller changes by one optional prop: its suite, the
      horizontal scroller and the text marquee pass unchanged; the chat
      reaches it through the kit's `Scroller` entry and the same template
      ref as before.
- [ ] Every chat class declares `propsTypes`, `propsDefaults`, `props`
      with `Kit.propsTypes` spread in; every view is `defineProps(X.Class.props)`;
      the gate's contract checks pass on the folder.
- [ ] A props-carrying entry becomes defaults: `DenseChat` renders the
      scroller at its entry's `assumedSize` and every code block at the
      entry's `cap` where the template omits them, and a card that
      passes `:cap` keeps its value.
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
- A view that constructs anything but the class its entry names.
- A model that names its own view, or reads a kit that is not its own class's.
- A swap, or a configuration a view already exposes as a prop, that needs a model class or a view edited.
- Anything but the one entry passed down for the kit's sake.
- A shell component between a parent and its child's view.

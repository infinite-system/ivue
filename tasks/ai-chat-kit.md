# The AI chat on the kit — the first malleable tree

Convert `examples/playground/src/examples/ai-chat/` from its two
registries (`Parts`, `Tools`) to the kit design settled on 2026-09-09:
every model carries `static get $kit`, a template names roles and never
components, a parent hands a child its model CLASS as the one prop the
kit adds, and every view constructs the class it was handed. The design
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
- **The class crosses the seam.** A parent renders
  `<component :is="chat.kit.Message.view" :model="chat.kit.Message.model" :row="item" :chat="chat" />`:
  the entry's view, the entry's model class as a prop, the child's own
  props. No kit prop, no inject. The child's model reads its kit from
  its own class — `get kit() { return this.self.$kit }` — so a swapped
  class brings its own kit, and no parent ever constructs a child.
- **Every view constructs the class it was handed.** The SFC is the
  wiring: `defineProps`, one `new`, the destructure. The one line the
  kit adds is `new (props.model ?? ChatMessage.Class)(props)`; the
  fallback is for a view mounted on its own (a docs demo, a spec).
  Lifecycle hooks in the constructor bind to the view's own component,
  exactly as today. The prop is typed `typeof ChatMessage.Class`, so a
  subclass is assignable and anything else is not.
- **Override is subclassing.** A subclass with a spread `$kit` swaps a
  role: `FancyChat.$kit.Scroller = { model: SnapScroller.Class, view: SnapScrollerView }`.
  A swap that must reach a deep leaf is the same spread with an optional
  `subtree` on the entry — a patch over the child's own kit — which
  `Kit.resolve` turns into derived subclasses once, at kit build time.
  One literal names the path from the root to the leaf; a class's own
  `$kit` never carries `subtree`.
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
// the class that view constructs. `subtree` is optional and appears only
// in an override: a patch over the model's own $kit, applied when the kit
// resolves. A kit is a record of entries or of nested records of entries.
export namespace Kit {
  export interface Entry<Model = unknown> {
    view: Component;
    model?: Model;
    subtree?: Patch;
  }

  /** a patch is a kit whose every field is optional; `{ subtree }` alone keeps model and view */
  export type Patch = { [role: string]: Partial<Entry> | Patch };

  export type Of<Roles extends string> = Record<Roles, Entry>;

  /** every entry with a subtree becomes an entry whose model is a derived class */
  export function resolve<K extends object>(kit: K): K {
    return Object.fromEntries(
      Object.entries(kit).map(([role, value]) => [role, isEntry(value) ? resolveEntry(value) : resolve(value as object)]),
    ) as K;
  }

  /** a subclass of `Base` whose `$kit` is `Base.$kit` deep-merged with `patch`, itself resolved */
  export function derive(Base: any, patch: Patch) {
    return Reactive(
      class extends Base {
        static get $kit() {
          return (this as any).cachedKit ??= resolve(merge(Base.$kit, patch));
        }
      },
    );
  }

  function resolveEntry(entry: Entry): Entry {
    if (!entry.subtree || !entry.model) return entry;
    const { subtree, ...rest } = entry;
    return { ...rest, model: derive(entry.model, subtree) };
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
    return typeof value === 'object' && value !== null && ('view' in value || 'model' in value || 'subtree' in value);
  }
}
```

A class's own `$kit` is written plain, with no `subtree` anywhere; it
needs no `resolve`. `subtree` and `resolve` belong to overrides, where a
patch names how deep it reaches and the resolver turns each reach into
a derived class once, cached on the class that asked.

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
    return this.cachedKit ??= {
      Scroller: { model: VirtualScroller.Class, view: VirtualScrollerView },
      Message: { model: ChatMessage.Class, view: ChatMessageView },
      Composer: { model: Composer.Class, view: ChatComposerView },
      Index: { model: Index.Class, view: ChatIndexView },
    } satisfies Kit.Of<'Scroller' | 'Message' | 'Composer' | 'Index'>;
  }

  protected static cachedKit?: ReturnType<typeof $Chat.$kit>;

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

The `cachedKit` static holds the object per class because a static getter
re-runs on every read; `??=` on `this` keys the cache by the class that
was asked, so a subclass's getter builds and caches its own.

### `AiChatExample.vue` — the root template names roles

```vue
<script setup lang="ts">
import { Chat } from './Chat';
import './ai-chat.css';

const props = defineProps<{ dark?: boolean; model?: typeof Chat.Class }>();

// the root constructs the class it was handed, or its own
const chat = new (props.model ?? Chat.Class)();

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
          :model="chat.kit.Scroller.model"
          scrollbar
          v-model="rows"
          :assumed-size="96"
          :padding-quantity="6"
          :selection-text="chat.rowText"
        >
          <template #item="{ item }">
            <component :is="chat.kit.Message.view" :model="chat.kit.Message.model" :row="item" :chat="chat" />
          </template>
        </component>
        <button v-if="chat.showsJumpToLatest" type="button" class="ac-jump" @click="chat.jumpToLatest()">↓ latest</button>
      </section>
      <component :is="chat.kit.Index.view" v-if="indexOpen" :model="chat.kit.Index.model" :chat="chat" />
    </div>

    <component :is="chat.kit.Composer.view" :model="chat.kit.Composer.model" :chat="chat" />
  </div>
</template>
```

No component import remains in the root. The scroller keeps its
template ref, its `v-model`, its slot and every prop; the only
difference from today is that its tag is an `:is` and it receives its
class.

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
    return this.cachedKit ??= {
      // parts by kind — the registry `Parts.ts` was, as entries
      text: { view: TextPartView },
      thinking: { view: ThinkingPartView },
      attachment: { view: AttachmentPartView },
      system: { view: SystemPartView },
      tool_call: { view: ToolCallPartView },
      tool_batch: { model: ToolBatchPart.Class, view: ToolBatchPartView },
      // the tool cards are reached through the tool base's kit, one hop down
      Tool: { model: ToolCallModel.Class, view: ToolCallPartView },
    } satisfies Kit.Of<SessionLog.Part['kind'] | 'Tool'>;
  }

  protected static cachedKit?: ReturnType<typeof $ChatMessage.$kit>;

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

  partModel(part: SessionLog.Part) {
    return this.partEntry(part).model;
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
    /** the class this view constructs; the parent's kit supplies it */
    model?: typeof Class;
  }

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

const props = defineProps<ChatMessage.Props>();

const model = new (props.model ?? ChatMessage.Class)(props);
</script>

<template>
  <article class="ac-msg" :class="model.rowClass">
    …header and stub unchanged…
    <div v-else class="ac-parts">
      <component
        :is="model.partView(part)"
        v-for="(part, at) in model.parts"
        :key="model.partKey(part, at)"
        :model="model.partModel(part)"
        :part="part"
        :chat="chat"
        :message="model.message"
      />
    </div>
  </article>
</template>
```

`Parts.ts` is deleted. A leaf part (text, thinking) receives `model`
as `undefined` and ignores it; its view constructs its own small class
as today. `tool_batch` has a model and constructs the one it is handed.

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
    return this.cachedKit ??= {
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
    };
  }

  protected static cachedKit?: ReturnType<typeof $ToolCallModel.$kit>;

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
    model?: typeof Class;
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
const props = defineProps<ChatMessage.PartProps<SessionLog.ToolCallPart> & { model?: typeof ToolCallModel.Class }>();

const base = props.model ?? ToolCallModel.Class;
</script>

<template>
  <component
    :is="base.toolFor(part.call.name).view"
    :model="base.toolFor(part.call.name).model"
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

const props = defineProps<ToolCallModel.Props>();

const model = new (props.model ?? BashCall.Class)(props);
</script>

<template>
  <div class="ac-tool ac-tool-bash" :class="model.cardClass">
    <component :is="model.kit.Head.view" :tool="model" />
    <div v-if="model.isExpanded" class="ac-tool-body">
      <p v-if="model.description" class="ac-tool-caption">{{ model.description }}</p>
      <section class="ac-tool-section">
        <h5>command <span v-if="model.ranInBackground" class="ac-tag">background</span></h5>
        <component :is="model.kit.CodeBlock.view" :model="model.kit.CodeBlock.model" :code="model.command" lang="bash" :cap="model.cap" wrap />
      </section>
      <section v-if="model.hasStdout" class="ac-tool-section">
        <h5>stdout <span class="ac-tag" :class="model.stateClass">{{ model.exitLabel }}</span></h5>
        <component :is="model.kit.CodeBlock.view" :model="model.kit.CodeBlock.model" :code="model.stdout" lang="text" :cap="model.cap" wrap />
      </section>
      <component :is="model.kit.Foot.view" :tool="model" />
    </div>
  </div>
</template>
```

`BashCall.ts` does not change: it extends the base and inherits `$kit`
through the static chain, so `BashCall.$kit === ToolCallModel.$kit`
until a subclass says otherwise. `ToolHead` and `ToolFoot` take the
instance as `tool` rather than `model`, because `model` is now the word
for a class crossing a seam and the two must not share a name.

### `CodeBlock.vue` — a leaf with a model constructs what it is handed

```vue
<script setup lang="ts">
import { CodeBlock } from './CodeBlock';

const props = defineProps<CodeBlock.Props>(); // Props gains `model?: typeof CodeBlock.Class`

const model = new (props.model ?? CodeBlock.Class)(props);
</script>

<template>
  <div class="ac-code" :class="model.blockClass" :style="model.blockStyle" v-html="model.renderedHtml"></div>
</template>
```

### `VirtualScroller.vue` — one optional prop, everything else untouched

```ts
// VirtualScroller.vue, the two lines that change
const props = defineProps({ ...VirtualScroller.Class.props, model: { type: Function, required: false } }) as unknown as VirtualScroller.Props<T>;
const virtualScroller = new ((props.model as typeof VirtualScroller.Class | undefined) ?? VirtualScroller.Class)<T>(props, emit);
```

The scroller's own example, the horizontal scroller and the text
marquee never pass `model`, so they construct the default exactly as
before.

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
    return this.cachedKit ??= {
      ...super.$kit,
      Scroller: { model: SnapScroller.Class, view: SnapScrollerView },
    };
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
<AiChatExample :model="FancyChat.Class" />
```

The scroller's contract with the chat is the surface `Chat` reads:
`visibleIndex`, `scrollToIndex`, `scrollPosition`, `estimatedItemSize`,
`cancelSeek`, the `item` slot. A swapped view must expose the same, and
naming that surface as `Chat.ScrollerContract` is the first thing the
conversion writes down.

### A different code block under one tool

```ts
// TerminalChat.ts — stdout as a terminal emulation, only under Bash
import { Kit } from './Kit';
import { Chat } from './Chat';
import { TerminalBlock } from './TerminalBlock';
import TerminalBlockView from './TerminalBlock.vue';

class $TerminalChat extends Chat.$Class {
  static override get $kit() {
    return this.cachedKit ??= Kit.resolve({
      ...super.$kit,
      Message: {
        ...super.$kit.Message,
        subtree: {
          Tool: {
            subtree: {
              Tools: {
                Bash: {
                  subtree: { CodeBlock: { model: TerminalBlock.Class, view: TerminalBlockView } },
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
only `subtree` keeps its model and view. `resolve` derives a
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
    return this.cachedKit ??= Kit.resolve({
      ...super.$kit,
      Message: {
        ...super.$kit.Message,
        subtree: {
          Tool: {
            subtree: {
              ...block, // the base's own entry, read by any card that does not override
              Generic: { subtree: block },
              Mcp: { subtree: block },
              Task: { subtree: block },
              Tools: Object.fromEntries(Object.keys(tools.Tools).map((name) => [name, { subtree: block }])),
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
<component :is="Chat.$kit.Message.view" :model="Chat.$kit.Message.model" :row="row" :chat="chat" />
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

it('a view constructs the class it is handed', async () => {
  const wrapper = mount(ChatMessageView, { props: { row, chat, model: TerminalMessage.Class } });
  expect(wrapper.vm.model).toBeInstanceOf(TerminalMessage.Class);
});
```

## The mapping

| today | after |
| --- | --- |
| `parts/Parts.ts` registry (kind → component) | `ChatMessage.$kit` keyed by part kind; the row model resolves `partEntry(part)`, text as the fallback |
| `tools/Tools.ts` registry (name → component, prefix families, generic fallback) | `ToolCallModel.$kit.Tools` plus `Mcp`, `Task`, `Generic` entries; the lookup is the static `toolFor(name)` on the base |
| `ToolHead.vue`, `ToolFoot.vue`, `CodeBlock.vue` used by name in every card | `ToolCallModel.$kit`: `Head`, `Foot` as leaf entries taking `tool`, `CodeBlock` as a pair; cards render `<component :is="model.kit.Head.view" :tool="model" />` |
| `Chat.ts` reaches the scroller through `ref="scroller"` | unchanged: the scroller's view constructs the class it is handed and exposes it; the chat keeps its template ref. The entry `Chat.$kit.Scroller = { model: VirtualScroller.Class, view: VirtualScrollerView }` is what a page overrides to put a different scroller under the chat |
| `ChatComposer.vue`, `ChatIndex.vue` construct their models | unchanged in who constructs; each news `props.model ?? Composer.Class` and is rendered through `chat.kit.Composer` |
| `ChatMessage.vue` constructs a row model per row in the scroller's slot | unchanged; the slot renders `<component :is="chat.kit.Message.view" :model="chat.kit.Message.model" :row="item" :chat="chat" />` |
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
  in every view: `new (props.model ?? Default.Class)(props)`. Check that
  a view mounted with no `model` prop (a docs demo, a spec) still
  constructs the default, that the gate's "one `new` in setup" reading
  accepts the indirection, and that a prop named `model` holding a
  class reads clearly beside the standard's `Model` instance type — if
  it does not, the prop is renamed once, everywhere.
- **The scroller's `model` prop.** `VirtualScroller.vue` gains the same
  optional prop; its default is its own class, so every existing use is
  untouched.
- **`ToolHead` and `ToolFoot` take the card's instance as `tool`.** Today
  the prop is `model`; the kit reserves that word for a class crossing a
  seam, so the two leaves rename their prop once. Every card's template
  changes the same two lines.
- **A deep swap is one literal, resolved once.** An override's entry
  may carry `subtree`, a patch over the child's own kit; `Kit.resolve`
  turns every reach into a derived class at kit build time, cached per
  class. A class's own `$kit` never carries `subtree`. Verify at
  conversion: `Reactive` over a subclass of an already-transformed class
  leaves inherited members alone (the engine's repeated-call guard says
  it does), and a derived class's `self` reads its own statics, which
  the `??=` on `this` depends on.
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
- A view that constructs anything but the class it was handed.
- A model that names its own view, or reads a kit that is not its own class's.
- A swap that needs a model class or a view edited.
- A kit, or any object but the model class, passed down as a prop.
- A shell component between a parent and its child's view.

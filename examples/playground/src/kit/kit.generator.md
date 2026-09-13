# The kit — generator, what fell out, what was refused

The record of how the kit reached its shape: the one invariant everything
derives from, the forms it generates, the forms that were tried and did not
survive, and the facts about TypeScript, Vue and the engine that were found
along the way. The contract that binds the code to specs is
`kit.invariants.md`; this file is the reasoning behind it, kept so the
refused forms are not rediscovered and the accepted ones are not re-argued.

Every claim below was executed: the specs named are in the tree, the
numbers were measured, the type behaviours were reproduced with `tsc` and
`vue-tsc`, and the browser behaviours were driven with Playwright on the
docs page.

## The generator

> A component's composition is data the class declares, one level deep; a
> patch edits that data by name; every seam reads an entry and never a role's
> name.

Everything else is a consequence. Written out:

- A class that composes others declares `static get $kit()`: an entry per
  role and, when the template loops, an `order`. Nothing below that level —
  the class an entry names declares the next level in its own kit.
- An entry is four fields: `view`, `namespace`, `props`, `bind`. Each says
  something true of its role alone.
- A container's template is one loop: `<component :is="model.kit[role].view"
v-bind="model.seam(role)" />` over `model.kit.order`. It names no role.
- A patch is a record with the same shape as a kit, merged over it by name.
  `order` is edited through relations against names — `after`, `before`,
  `without`, `move` — never a list. `subkit` reaches the next level.
- Every compositor extends `KitContainer`. It inherits `kit` and `seam`, and
  supplies for a list the two facts a list owns: `roleOf` and `keyOf`.

## What it generates

### One shape at four scales

A layer is a subclass. An entry shadows an entry. A relation shadows a
position. A patch shadows a kit. `?? super` at every scale: a subclass's
getter falls back to `super`, a layer's bind extends `inherited()`, a
derived kit's order is the base's with relations applied. Nothing in the
system is positional except the chain of layers, and the chain is data
`derive` leaves on the namespace (`derivedFrom`, `patch`, `layer`), so
`KitInspect` can read it back.

### The file tree is the kit

A file is named by its position in the kit: the compositor whose `$kit`
names the role, a dot, the role key exactly as `order` spells it, a second
dot and a variant name when the file is an alternate view for that role. A
compositor's own three files carry its bare class name. A class file whose
stem is dotted declares the class the stem spells with its dots removed —
`MessagePart.Text.ts` declares `$MessagePartText` — and the standards gate
reads a dotted stem that way. Folders are kebab-case and named after the
family they hold; a subfolder appears exactly where a role is itself a
compositor.

```
message/
  ChatMessage.ts / .vue / .test.ts        the compositor
  ChatMessage.Header.vue                  a classless leaf: role Header of ChatMessage
  ChatMessage.Header.Bubble.vue           an alternate view for the same role
  message-part/
    MessagePartList.ts / .vue             the list: a compositor of its own
    MessagePart.ts                        the family's shared Props
    MessagePart.Text.ts / .vue            role Text, class $MessagePartText
    tool-call/
      ToolCall.ts                         the base of the calls
      ToolCall.Header.vue                 a classless leaf of ToolCall
      ToolCall.Bash.ts / .vue             role Bash, class $ToolCallBash
```

Browsing the folder, the prefix says who composes the file, the segment
after the dot is the string a patch author writes in `without` or `move`,
and a name with two dots is a variant. Grepping a role, reading the folder
and printing `KitInspect.tree` agree without a comment. The first word is
the family, so quick-open by name never collides: `MessagePart.Text`, not
`Text`.

A record type a class renders is not the class and keeps its own name:
`SessionLog.TextPart` is the log's record, `MessagePartText` renders it.
Who wrote a message is its `speaker`; `role` means a kit role everywhere.

### A kit is read as its template

Its entries are declared in the sequence `order` renders them, `view`
first in every entry — what renders, then what runs it, then what it
receives. `KitInspect.misordered` reports a hand-written kit declared in
another sequence, and the chat asserts its whole tree clean. A derived
layer is exempt: `merge` appends what a patch inserts.

### Presence is the leaf's own

A leaf's root carries `v-if` on a named getter of the model:

```vue
<footer v-if="model.hasReceipt" class="ac-msg-foot">{{ model.receiptLabel }}</footer>
```

The container's loop carries no `v-if`. A layer changes presence the way it
changes any fact of the model — override the getter with a `super`
fallback. The one cost is that a hidden role still mounts and renders a
comment; for the row that is three classless leaves and, while a row is a
stub, one list instance over an empty array.

### A bind is a named static

```ts
static bindPart({ model, item }: Kit.Seam<$MessagePartList, SessionLog.Part>): MessagePart.Props {
  return { part: item, chat: model.chat, message: model.message };
}
```

and the kit names it on every entry it feeds: `bind: this.bindPart`. The
`$kit` getter runs once per class with `this` as that class, so a subclass
that overrides `bindPart` with `...super.bindPart(seam)` changes what every
part receives without redeclaring the kit; the base kit keeps its own
function. An inline arrow can never be extended. A bind with an annotated
return refuses a wrong key at its `return`; a patch's inline bind is checked
by `derive` through `Checked`.

### What a child receives is declared on its entry

Nothing crosses a seam by markup. A `<component>` seam carries `:is` and
`v-bind` and nothing else, because an attribute on a seam is the one thing
no patch can reach. Constants a consumer sets go in `props` and the child
reads them through its own getters (`this.props.kit.props.cap`); anything
that depends on the model or the item goes in `bind`.

### A dispatch is a list

The tool-call part renders one `<component>` chosen by tool name. It is a
`KitContainer` whose `roleOf` picks a card — exact name, then a family by
prefix or pattern, then the generic card — and the thirteen cards are flat
roles beside the three families. `entryOf`, `viewOf` and `propsOf` fall
out. A list of one is still a list.

### Eleven card templates were one

Every tool card rendered the same forty lines — the frame, the header
seam, an expanded body, a loop of code blocks, the footer seam — and
differed only in a caption line and, for four tools, hand-written sections.
The variation was entirely in the class. Now `ToolCall.vue` renders every
card as its sections in order — `Header, Caption, Sections, Thread,
Footer` — and a tool's class supplies its `sections` as data (a title, a
path, tags, a tone, whether to wrap, a note for an empty block), its
`caption`, and for six tools a `Caption` entry pointing at a view of its
own. The blocks are a list compositor of their own, `ToolCallSections`,
fed by a bind and rendering one `CodeBlock` role per section. The
expanded state is presence at each leaf's root; the body wrapper became a
CSS rail on the leaves past the header. Every seam passes props through a
bind — the three places where markup still handed a prop to a child were
the header seam, the block seam and the sub-thread seam, and all three are
gone. A plugin can now patch any card's caption, sections or blocks by
data, which nothing could do while the cards were templates.

One type fact came out of it. `Bound<N>` was `Partial<PropsOf<N>> & Attrs`,
and `Attrs` is keyed by template literals; an interface — every child's
`Props` — has no implicit index signature, so no named static bind
returning its child's `Props` was assignable to it. The row's compiled by
an accident of intersection. `Bound<N>` is a union now: `Partial<Props>`
alone admits the interface, `Partial<Props> & Attrs` admits an attribute
beside the props, and a wrong key matches neither.

### A leaf never wraps a seam in markup

The last shape the rule flushed out: a list whose per-item template was a
`section` wrapper, an `h5` title with tags, the block seam and a note
paragraph. That is a card template one level down — markup naming what an
item renders — and a layer could reach none of it. The item became a
compositor of its own: `ToolCallSection` with `Title, Block, Note` in an
order, the title and the note as classless leaves at their own roots, the
code block rendering nothing over no code so the note stands in. The same
test found two more: the system line (a button, a folded detail, a thread)
and the batch (a head row, then its calls). Each is now a container whose
template is the one-line loop, with its former markup as leaves. The rule
that decides it every time: if markup sits between a compositor and a seam,
the markup is a leaf of a compositor whose order places the seam; a
wrapper around a seam is a compositor, or it is nothing.

### Plugins compose by data

`[p1, p2, p3].reduce(derive, Base)`; later wins, the way a later stylesheet
wins. A field two layers both replace is a contact `KitInspect.conflicts`
names with both layers in order; `report` warns or throws when strict. A
bind over a bind and an insert beside another are composition, not
contacts. A subkit reaches any depth — the row spec proves a chat patch
swapping one part view two levels down, with the list's own bind kept and
every shipped kit untouched.

## The standard, in full examples

The operational form of everything above, written to be lifted into the
ivue skill as-is. Each example is complete: a file a reader copies, not a
fragment. The rule each one carries is stated once beneath it; the argument
for the rule is elsewhere in this file.

### A compositor with sections

```ts
// message/ChatMessage.ts — one row of the thread: its sections in order
import { Reactive } from '../../../ivue';
import { Static } from '../../../Static';
import { Kit } from '../../../kit/Kit';
import { KitContainer } from '../../../kit/KitContainer';
import { MessagePartList } from './message-part/MessagePartList';
import MessagePartListView from './message-part/MessagePartList.vue';
import GutterView from './ChatMessage.Gutter.vue';
import HeaderView from './ChatMessage.Header.vue';
import StubView from './ChatMessage.Stub.vue';
import AwaitView from './ChatMessage.Await.vue';
import FooterView from './ChatMessage.Footer.vue';
import type { Chat } from '../Chat';
import type { SessionLog } from '../SessionLog';

class $ChatMessage extends KitContainer.$Class<ChatMessage.Roles> {
  /** the row's sections in the order the template renders them — built once per class by
   *  Static(); each leaf decides its own presence at its root */
  static override get $kit(): ChatMessage.Roles {
    return {
      Gutter: { view: GutterView },
      Header: { view: HeaderView },
      Stub: { view: StubView },
      MessagePartList: {
        view: MessagePartListView,
        namespace: MessagePartList,
        bind: this.bindPartList
      },
      Await: { view: AwaitView },
      Footer: { view: FooterView },
      order: ['Gutter', 'Header', 'Stub', 'MessagePartList', 'Await', 'Footer']
    };
  }

  /** what the parts list receives from the row: the message's parts, the chat, the message */
  static bindPartList({ model }: Kit.Seam<$ChatMessage>): MessagePartList.Props {
    return { parts: model.parts, chat: model.chat, message: model.message };
  }

  constructor(public props: ChatMessage.Props) {
    super();
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected override get self() {
    return this.constructor as typeof $ChatMessage;
  }

  get chat(): Chat.Model {
    return this.props.chat;
  }

  get row(): Chat.Row {
    return this.props.row;
  }

  /** the message once its page has landed; re-read on every revision so streaming growth shows */
  get message(): SessionLog.Message | null {
    void this.chat.revision.value;
    return this.row.message;
  }

  get parts(): SessionLog.Part[] {
    return this.message?.parts ?? [];
  }

  get isStub(): boolean {
    return this.message === null;
  }

  get hasReceipt(): boolean {
    return this.receiptLabel !== '';
  }

  get receiptLabel(): string {
    const usage = this.message?.usage;
    if (!usage) return '';
    return `${usage.output_tokens} tokens`;
  }
}

export namespace ChatMessage {
  export const $Class = Static($ChatMessage);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export interface Props {
    row: Chat.Row;
    chat: Chat.Model;
    /** the entry this view was rendered through: the class it constructs */
    kit?: Kit.Entry;
  }

  /** what every section receives from the row: its entry and the row model */
  export interface SectionProps {
    kit: Kit.Entry;
    model: Instance;
  }

  export type Role = 'Gutter' | 'Header' | 'Stub' | 'MessagePartList' | 'Await' | 'Footer';
  /** declared, so the row's instance type and its kit can name each other without a cycle */
  export type Roles = Kit.Of<Role, $ChatMessage> & {
    MessagePartList: Kit.Entry<$ChatMessage, undefined, typeof MessagePartList>;
    order: readonly Role[];
  };
}
```

```vue
<!-- message/ChatMessage.vue — the container's template is the loop and nothing else -->
<script setup lang="ts">
import { ChatMessage } from './ChatMessage';

const props = defineProps<ChatMessage.Props>();

// the one `new`: the class the entry names, or this view's own
const model = new (
  (props.kit?.namespace?.Class as typeof ChatMessage.Class | undefined) ?? ChatMessage.Class
)(props);
</script>

<template>
  <article class="ac-msg" :class="model.rowClass">
    <template v-for="role in model.kit.order" :key="role">
      <component :is="model.kit[role].view" v-bind="model.seam(role)" />
    </template>
  </article>
</template>
```

The rules this carries: the class extends `KitContainer.$Class<X.Roles>`;
`$kit` declares its return type and never uses `satisfies`; `Roles` names
each classed entry's namespace; entries are declared in the sequence
`order` renders them, `view` first; a bind is a named static the entry
names; the template names no role and carries no `v-if`; the constructor
calls `super()` first; `self` is `protected override`.

### A classless leaf, and its presence

```vue
<!-- message/ChatMessage.Footer.vue — role Footer of ChatMessage -->
<script setup lang="ts">
import type { ChatMessage } from './ChatMessage';

// The reply's receipt: tokens and wall time. Markup only, over the row model.
defineProps<ChatMessage.SectionProps>();
</script>

<template>
  <footer v-if="model.hasReceipt" class="ac-msg-foot">{{ model.receiptLabel }}</footer>
</template>
```

```vue
<!-- message/ChatMessage.Header.Bubble.vue — an alternate view for role Header -->
<script setup lang="ts">
import type { ChatMessage } from './ChatMessage';

// A swapped header for the bubble tree: the name and the time on one quiet line.
defineProps<ChatMessage.SectionProps>();
</script>

<template>
  <header class="ac-msg-head ac-bubble-head">
    <span class="ac-msg-role">{{ model.speakerLabel }}</span>
    <span class="ac-msg-time">{{ model.timeLabel }}</span>
  </header>
</template>
```

The rules: a classless leaf is `Compositor.Role.vue`, a variant is
`Compositor.Role.Variant.vue`; it declares `SectionProps` and reads the
model dotted; its root carries its own `v-if` on a named getter; it holds
no state and constructs nothing.

### A list compositor, its classed roles, and a shared bind

```ts
// message/message-part/MessagePartList.ts — the parts of one message as a list
import { Reactive } from '../../../../ivue';
import { Static } from '../../../../Static';
import { Kit } from '../../../../kit/Kit';
import { KitContainer } from '../../../../kit/KitContainer';
import { MessagePartText } from './MessagePart.Text';
import MessagePartTextView from './MessagePart.Text.vue';
import { MessagePartThinking } from './MessagePart.Thinking';
import MessagePartThinkingView from './MessagePart.Thinking.vue';
import { MessagePartToolCall } from './MessagePart.ToolCall';
import MessagePartToolCallView from './MessagePart.ToolCall.vue';
import type { Chat } from '../../Chat';
import type { MessagePart } from './MessagePart';
import type { SessionLog } from '../../SessionLog';

class $MessagePartList extends KitContainer.$Class<MessagePartList.Roles, SessionLog.Part> {
  /** a role per part kind, each naming the one bind they share; `Roles` types the entries loosely
   *  on purpose — each part class declares `part` as its own kind while the seam's item is the
   *  union `roleOf` narrows at runtime */
  static override get $kit(): MessagePartList.Roles {
    return {
      Text: { view: MessagePartTextView, namespace: MessagePartText, bind: this.bindPart },
      Thinking: {
        view: MessagePartThinkingView,
        namespace: MessagePartThinking,
        bind: this.bindPart
      },
      ToolCall: {
        view: MessagePartToolCallView,
        namespace: MessagePartToolCall,
        bind: this.bindPart
      }
    };
  }

  /** what every part receives from the list: its part, the chat, the message — the seam's item is the part */
  static bindPart({ model, item }: Kit.Seam<$MessagePartList, SessionLog.Part>): MessagePart.Props {
    return { part: item, chat: model.chat, message: model.message };
  }

  /** a part kind (the log's snake_case) names its role (the kit's PascalCase) */
  static readonly PART_ROLES: Record<SessionLog.Part['kind'], MessagePartList.Role> = {
    text: 'Text',
    thinking: 'Thinking',
    tool_call: 'ToolCall'
  };

  constructor(public props: MessagePartList.Props) {
    super();
  }

  protected override get self() {
    return this.constructor as typeof $MessagePartList;
  }

  /** the parts grow in place while a reply streams, so the list re-reads the chat's revision */
  get parts(): SessionLog.Part[] {
    void this.chat.revision.value;
    return this.props.parts;
  }

  get chat(): Chat.Model {
    return this.props.chat;
  }

  get message(): SessionLog.Message | null {
    return this.props.message;
  }

  /** the list renders once the message is here; a stub row has no parts to list */
  get hasMessage(): boolean {
    return this.message !== null;
  }

  /** the role a part takes: its kind's, or Text for a kind nobody mapped — the list's fact */
  override roleOf(part: SessionLog.Part): MessagePartList.Role {
    return this.self.PART_ROLES[part.kind] ?? 'Text';
  }

  /** what identifies a part in the list: a call's id, else its kind and place — the list's fact */
  override keyOf(part: SessionLog.Part, at: number): string {
    if (part.kind === 'tool_call') return part.call.id;
    return `${part.kind}-${at}`;
  }
}

export namespace MessagePartList {
  export const $Class = Static($MessagePartList);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export interface Props {
    parts: SessionLog.Part[];
    chat: Chat.Model;
    message: SessionLog.Message | null;
    kit?: Kit.Entry;
  }

  export type Role = 'Text' | 'Thinking' | 'ToolCall';
  export type Roles = Kit.Roles<Role, $MessagePartList, SessionLog.Part>;
}
```

```vue
<!-- message/message-part/MessagePartList.vue — a list renders one shape -->
<script setup lang="ts">
import { MessagePartList } from './MessagePartList';

const props = defineProps<MessagePartList.Props>();

const model = new (
  (props.kit?.namespace?.Class as typeof MessagePartList.Class | undefined) ?? MessagePartList.Class
)(props);
</script>

<template>
  <div v-if="model.hasMessage" class="ac-parts">
    <component
      v-for="(part, at) in model.parts"
      :key="model.keyOf(part, at)"
      :is="model.viewOf(part)"
      v-bind="model.propsOf(part, at)"
    />
  </div>
</template>
```

```ts
// message/message-part/MessagePart.Text.ts — role Text of the list; the stem spells $MessagePartText
import { Reactive } from '../../../../ivue';
import { Static } from '../../../../Static';
import type { MessagePart } from './MessagePart';
import type { SessionLog } from '../../SessionLog';

class $MessagePartText {
  constructor(public props: MessagePart.Props<SessionLog.TextPart>) {}

  get part(): SessionLog.TextPart {
    return this.props.part;
  }

  get text(): string {
    void this.props.chat.revision.value;
    return this.part.text;
  }
}

export namespace MessagePartText {
  export const $Class = Static($MessagePartText);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}
```

The rules: a view that loops over seams is a compositor with a class of its
own; a list supplies `roleOf` and `keyOf` as overrides and `entryOf`,
`viewOf` and `propsOf` fall out; a shared bind is one named static every
fed entry names; a classed role is `Family.Role.ts` beside
`Family.Role.vue`, its class named by the stem with dots removed; a record
type (`SessionLog.TextPart`) keeps its own name.

### A dispatch is a list of one

```ts
// message/message-part/MessagePart.ToolCall.ts — one card, chosen by tool name
class $MessagePartToolCall extends KitContainer.$Class<
  MessagePartToolCall.Roles,
  SessionLog.ToolCall
> {
  static override get $kit(): MessagePartToolCall.Roles {
    return {
      Generic: { view: ToolCallGenericView, namespace: ToolCall, bind: this.bindCard },
      Mcp: { view: ToolCallMcpView, namespace: ToolCallMcp, bind: this.bindCard },
      Task: { view: ToolCallTaskView, namespace: ToolCallTask, bind: this.bindCard },
      Bash: { view: ToolCallBashView, namespace: ToolCallBash, bind: this.bindCard },
      Edit: { view: ToolCallEditView, namespace: ToolCallEdit, bind: this.bindCard },
      Read: { view: ToolCallReadView, namespace: ToolCallRead, bind: this.bindCard }
    };
  }

  /** what every card receives from the part: the call, the chat, the message */
  static bindCard({ model }: Kit.Seam<$MessagePartToolCall>): ToolCall.Props {
    return { call: model.call, chat: model.props.chat, message: model.props.message };
  }

  static readonly TASK_TOOLS = /^Task(Create|Update|List|Get|Stop|Output)$/;

  /** the role for a tool name: its own card, then a family by prefix, then the generic card */
  static roleFor(name: string): MessagePartToolCall.Role {
    if (Object.hasOwn(this.$kit, name)) return name as MessagePartToolCall.Role;
    if (name.startsWith('mcp__')) return 'Mcp';
    if (this.TASK_TOOLS.test(name)) return 'Task';
    return 'Generic';
  }

  constructor(public props: MessagePartToolCall.Props) {
    super();
  }

  protected override get self() {
    return this.constructor as typeof $MessagePartToolCall;
  }

  get call(): SessionLog.ToolCall {
    return this.props.part.call;
  }

  /** the role a call takes — the one fact of a dispatch */
  override roleOf(call: SessionLog.ToolCall): MessagePartToolCall.Role {
    return this.self.roleFor(call.name);
  }
}
```

```vue
<!-- message/message-part/MessagePart.ToolCall.vue -->
<template>
  <component :is="model.viewOf(model.call)" v-bind="model.propsOf(model.call)" />
</template>
```

The rules: a dispatch by an external name is a flat set of roles picked by
`roleOf`, never a map under a key; the dispatch table is the container's,
in code, with a typed `Role` union — never spread across entries as
predicates; a layer that adds a card adds an entry, and `roleFor` finds it
by name.

### A layer as a patch

```ts
// variants/ChatVariants.ts — three trees over the shipped chat, each a patch and nothing copied
class $ChatVariants {
  static get $trees(): Record<string, Kit.Namespace> {
    return {
      shipped: ConfiguredChat,

      // drop the gutter, swap the header
      bubbles: Kit.Class.derive(
        ConfiguredChat,
        {
          Message: {
            subkit: { order: { without: ['Gutter'] }, Header: { view: HeaderBubbleView } }
          }
        },
        'bubbles'
      ),

      // drop the gutter and the footer, swap the header
      minimal: Kit.Class.derive(
        ConfiguredChat,
        {
          Message: {
            subkit: {
              order: { without: ['Gutter', 'Footer'] },
              Header: { view: HeaderMinimalView }
            }
          }
        },
        'minimal'
      ),

      // a rule after the header, the footer moved above the parts, and the footer's bind extended
      compact: Kit.Class.derive(
        ConfiguredChat,
        {
          Message: {
            subkit: {
              order: {
                without: ['Gutter'],
                after: { Header: ['Rule'] },
                move: { Footer: { before: 'MessagePartList' } }
              },
              Rule: { view: 'hr', bind: () => ({ class: 'ac-rule' }) },
              Footer: { bind: ({ inherited }) => ({ ...inherited(), class: 'ac-foot-lead' }) }
            }
          }
        },
        'compact'
      ),

      // two levels down: the chat's row's list's Text view
      preformatted: Kit.Class.derive(
        ConfiguredChat,
        { Message: { subkit: { MessagePartList: { subkit: { Text: { view: 'pre' } } } } } },
        'preformatted'
      )
    };
  }
}
```

The rules: a patch has a kit's shape and is merged by name; `order` is
edited only through `after`, `before`, `without`, `move`; a tag role is an
entry whose `view` is a tag name; a patch's bind is inline and composes
through `inherited()`; `subkit` reaches the next level and any depth
below; a layer has a name, so the inspector can attribute it.

### A layer as a subclass

```ts
// a plugin that extends what every part receives, and adds a part kind — a subclass, patched in by namespace
import { Kit } from '../../../../kit/Kit';
import { MessagePartList } from './MessagePartList';
import { MessagePartImage } from './MessagePart.Image';
import MessagePartImageView from './MessagePart.Image.vue';

class $DensePartList extends MessagePartList.$Class {
  /** the shipped kit plus one role; the shipped entries keep their bind, which is now this class's */
  static override get $kit(): DensePartList.Roles {
    return {
      ...super.$kit,
      Image: { view: MessagePartImageView, namespace: MessagePartImage, bind: this.bindPart }
    };
  }

  /** every part receives what the base hands it, and a density flag */
  static override bindPart(
    seam: Kit.Seam<$DensePartList, SessionLog.Part>
  ): MessagePart.Props & { dense: boolean } {
    return { ...super.bindPart(seam), dense: true };
  }

  protected override get self() {
    return this.constructor as typeof $DensePartList;
  }

  /** an image part takes the new role; everything else asks the base */
  override roleOf(part: SessionLog.Part): DensePartList.Role {
    return part.kind === 'image' ? 'Image' : super.roleOf(part);
  }
}

export namespace DensePartList {
  export const $Class = Static($DensePartList);
  export let Class = Reactive($Class);
  export type Role = MessagePartList.Role | 'Image';
  export type Roles = Kit.Roles<Role, $DensePartList, SessionLog.Part>;
}

// patched into the chat where the row names its list
const DenseChat = Kit.Class.derive(
  ConfiguredChat,
  { Message: { subkit: { MessagePartList: { namespace: DensePartList } } } },
  'dense'
);
```

The rules: a layer that must change a getter, a bind or `roleOf` is a
subclass of the raw `$Class`, with `override` and a `super` fallback, and
it is patched in through `namespace:`; `super.bindPart(seam)` works because
`Static()` caches every bound method under its own symbol; `...super.$kit`
works because a `$`-getter runs once per class with `this` as that class.

### Plugins, and reading the chain back

```ts
// plugins.ts — three layers from three authors, and what the chain says about them
import { Kit } from './kit/Kit';
import { KitInspect } from './kit/KitInspect';

const Base = ConfiguredChat;
const layers = [bubbleTheme, receiptsFirst, denseParts];
const App = layers.reduce((tree, patch) => Kit.Class.derive(tree, patch.patch, patch.name), Base);

// every field two layers both wrote, in derivation order — a warning, or a throw when strict
KitInspect.Class.report(App, { strict: import.meta.env.PROD });
// → ['Message.Header.view: written by bubbleTheme, then receiptsFirst']

// the resolved tree, one line per seam, with the layer that set each of its facts
console.log(KitInspect.Class.tree(App));
// order: Header Rule Stub Footer MessagePartList Await
// 0 Header: view Card.Header.Fancy · class - · bind no · view←receiptsFirst
// 1 Rule: view <hr> · class - · bind yes · view←receiptsFirst, bind←receiptsFirst, position←receiptsFirst
// …
//   - Text: view MessagePart.Text · class $MessagePartText · bind yes · base

// a hand-written kit declared in another sequence than its order
KitInspect.Class.misordered(App);
// → []
```

The rules: later wins; a contact is reported, never merged; `report` runs
where a plugin is installed, strict in production; `misordered` is asserted
clean in a spec.

### A widening subclass

```ts
// fixtures/ThemedCode.ts — a subclass that adds a prop and an event, and reads them typed
class $ThemedCode extends Code.$Class {
  static override get propsTypes() {
    return definePropTypes({
      ...super.propsTypes,
      theme: { type: String as PropType<string> }
    });
  }

  static override get emits() {
    return {
      ...super.emits,
      select: (code: string) => typeof code === 'string'
    };
  }

  /** the widened contract, redeclared for the type only: `declare` emits no field and runs nothing */
  declare props: ThemedCode.Props;
  declare emit: ThemedCode.Emits;

  protected override get self() {
    return this.constructor as typeof $ThemedCode;
  }

  /** the declared prop wins; the kit's `theme` is the fallback the base class already reads */
  override get theme(): string | undefined {
    return this.props.theme ?? super.theme;
  }

  select() {
    this.emit('select', this.visible);
  }
}

export namespace ThemedCode {
  export const $Class = Static($ThemedCode);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
  export type Props = ExtractPropTypes<typeof $Class.props>;
  export type Emits = ExtractEmitTypes<typeof $Class.emits>;
}
```

The rule: a subclass that widens props or emits redeclares `props` and
`emit` with `declare`, and never casts them at a use site.

### Checks, every time

```sh
# types, including the .vue files — vue-tsc pinned, or it dies on TypeScript 7
(cd examples/playground && npx tsc --noEmit -p tsconfig.json)
(cd examples/playground && npx -y -p vue-tsc@2 -p typescript@5 vue-tsc --noEmit -p tsconfig.json)

# specs, the standards gate, the contract checker
npx vitest run examples/playground/src
npm run build:docs
node .claude/skills/invariants/scripts/check_invariants.mjs --all --refs

# and after any change to a render path: drive the page
node drive.cjs   # Playwright over http://localhost:5174/examples/ai-chat — load, scroll far, send, count rows
```

## The type layer, as it actually behaves

- **`$kit` declares its return type.** `static get $kit(): X.Roles`, with
  `Roles` naming each entry's namespace (`Kit.Entry<$X, Item, typeof
Child>`). The `satisfies` form keeps the literal's inferred type, which
  carries each view's concrete SFC component type; a classless leaf's props
  name `X.Instance`, whose `kit` is that literal — TS2615, `circularly
references itself in mapped type`. Only `vue-tsc` sees it, because the
  cycle closes through `.vue` files; plain `tsc` on the playground is clean
  either way.
- **`vue-tsc` runs pinned or not at all.** `npx -y -p vue-tsc@2 -p
typescript@5 vue-tsc --noEmit -p examples/playground/tsconfig.json`. An
  unpinned `npx vue-tsc` resolves TypeScript 7 and dies on `./lib/tsc`. On
  `main` it crashes inside TypeScript and prints no errors, which is not
  zero errors — read a run to its end.
- **A wrong key in a bind is refused by freshness, not by index
  signatures.** An object literal is checked for excess keys while it is
  fresh, at the point it meets a declared type. A static or function with an
  annotated return — `Child.Props`, or `Kit.Bound<typeof Child>` when an
  attribute rides along — refuses `cod` for `code` at the `return`. The one
  form that lets it through is an inline arrow with no return annotation:
  its return type is inferred first, the literal is no longer fresh, and
  function assignability never checks excess keys. That form is exactly a
  patch's inline bind, and `derive` checks those through `Checked`.
- **`Kit.View` admits a generic SFC.** `vue-tsc` types a `<script setup
generic="T">` component as a function of its type parameter, not a
  `Component`; the virtual scroller is one and five kits name it.
- **`Entry.namespace` is optional** because a tag role has none, so a view
  reads `props.kit?.namespace?.Class`, cast to its own `typeof X.Class |
undefined`.
- **A widening subclass redeclares for the type.** `declare props:
Themed.Props; declare emit: Themed.Emits;` — no field, no initializer,
  and every `this.props` read and `this.emit` call below is typed to the
  subclass, because a bag with one more optional field and an emit that
  takes one more event both assign to the base's.
- **A shared bind is typed loosely on purpose.** `bindPart` serves six part
  classes whose props each name their own kind; the seam's item is the
  union `roleOf` narrows at runtime, so no single class can check it. The
  list's `Roles` is `Kit.Roles<Role, $MessagePartList, SessionLog.Part>`
  and the entries are plain literals.
- **`KitContainer.self` is a statics contract**, `{ $kit }`, so every
  subclass's own `self` — its whole constructor — narrows it without
  conflict. `Composer.Model` is the raw class type, not
  `InstanceType<typeof Class>`, or the kit that names the picker cycles.

## The engine fact this uncovered

`super.method()` in a static override recursed under `Static()`. Every
bound method was cached under `Symbol.for('ivue.staticBound.<name>')` — one
registered symbol per name, shared by every accessor of that name in a
hierarchy. A child's `static override greet() { return super.greet() }` read
the parent's accessor with `this` as the child, found the child's own bound
override already cached under the shared key, and called itself. The same
latent defect sat under `$`-caches, where `super.$kit` could return the
child's cached value. The fix is one unregistered symbol per accessor, with
the re-wrap guard skipping `STATIC_RAW` and the issued keys explicitly. The
engine spec `super reaches the parent under Static()` binds it in both read
orders; coverage stays 100% on every metric; core 1,095 B gzipped, extras
882 B. It was found by proving that `bind: this.bindPart` extends through
`super` — the shape that makes a named bind the true one.

## What was refused, and why each failed

Every one of these was built or argued far enough to see the branch it
added. They are recorded so the argument is not had twice.

- **Nested children in one object** (`children: {…}` on an entry, or a
  `Parts` map on the row holding the part roles). A third kind of thing
  under an entry, a branch in every walk, and `subkit` with the opposite
  meaning. The invariant is one level per class; a view that loops over
  seams is a compositor with a class of its own, never a classless leaf
  whose roles a parent declares for it. `MessagePartList` is the case that
  closed it: the row once held `roleOf`, `keyOf`, the kind table and the
  part bind on behalf of a classless list view.
- **A role map under one key** (`Tools`, the cards by tool name). The last
  reason a kit held anything but entries, and a branch in `merge`, `freeze`
  and the inspector (`isEntry` and three recursions). A flat set of roles
  keyed by the same names dispatches through `roleOf` with no map; the
  concept left the kit entirely.
- **Dispatch by data** (`takes` on the entry; the first entry whose
  predicate holds renders the item, the one without is the fallback). Built,
  specified, reverted. Dispatch is one total function with a precedence and a
  fallback — a fact of the container, like `keyOf` — and splitting it across
  entries scattered that function into thirteen predicates whose composition
  was implicit: declaration order decided precedence, absence of a field
  marked the fallback, and a layer that had to win narrowed someone else's
  predicate. More concepts, and `roleFor` returned `string` where `roleOf`
  returned the typed `Role` union.
- **Presence on the entry** (`shows: (row) => row.hasReceipt`). Presence
  composes — a layer wants "the base rule, and not in compact density" —
  and a single replaceable predicate cannot; giving it an `inherited` makes
  it a second `bind`, and a bind returning a boolean is the hidden `v-if`
  refused at the start. Presence in a `shows(role)` switch on the container
  composed through `super` but was the one place a compositor still named
  its roles in code, and existed only to serve a protocol the loop had to
  call. The leaf's own root `v-if` on a named getter deletes the protocol.
- **A container-wide default bind** (`bindEntry`, injected by
  `this.entry()`). A hidden default: reading `MessagePartList:
this.entry(View, NS)` you could not see the entry was bound, and a second
  list role with different props would have received the wrong ones
  silently. The entry names its bind.
- **`KitContainer.entry()` as an alias of `Kit.Class.entry`.** One name per
  thing.
- **`Kit.Class.entry(...)` at all.** It existed to refuse a wrong key in an
  inline bind by inferring the bind's result and running `Exact` over its
  keys. A named static with an annotated return gets that refusal from
  freshness, and an inline bind belongs in a patch, where `derive` checks
  it. One rule, no helper. The explanation first given for keeping it —
  that `Attrs`'s template-literal index signatures suppress the check — was
  wrong and was replaced after a probe showed a `Bound`-annotated static
  refusing the key.
- **A per-class kit object carrying `propsOf` and friends** instead of a
  base class. A seam needs the model, so either the template names it twice
  or an object is allocated per row, and the kit stops being data. Mixin
  capabilities were the earlier form of the same wish; the kit is the
  essence of a compositor, one base per essence, everything else held.
- **A held form** (a compositor that does not extend `KitContainer` and
  writes `seam` by hand). A hedge with no instance behind it. If a domain
  base ever appears, the domain base extends the container.
- **`namespace` renamed to `model`** on the entry. `model` already names the
  instance in every seam (`{ model, kit }`), in `X.Model` and in
  `Kit.ModelOf<N>`; the field holds the namespace, and one word for two
  things inside one seam is the failure the docs refuse.
- **`Role` renamed** for the kit primitive. `Slot` is Vue's word for a
  position filled by template code at the usage site, and the standard
  already calls `Class` the live slot; `Seam` is the crossing; `Part` is the
  chat's domain; `Position` is what `order` assigns. A role is a named
  position exactly one actor plays at a time and a patch recasts, which is
  the substitution semantics. The collision was the chat's author field,
  which became `speaker`.
- **Default exports for namespaces.** Every class file has a sibling `.vue`
  whose only export is default, so `import { X }` / `import XView from
'./X.vue'` tells the reader which of the pair a line imports; default for
  both forces an alias at every call site, and default imports let each
  file invent a name.
- **Slots as the sections.** Slot content is template code in one file, not
  data; a layer cannot fill a slot, and two plugins cannot compose slot
  fragments. Slots remain a possible third lever — a dynamic slot per role
  with the kit as fallback, filled inline at one usage site and composing
  with nothing — designed and not built.
- **Whole-row swap** instead of role trees. More readable when one author
  owns every variant, and it fails the moment two independent layers both
  want to change the row, because layer B must copy layer A's copy.
- **`bindEntry` typed loosely, `this.entry` typed loosely.** Both forms are
  gone with the helpers they served.

## Measured

Same harness both columns, median of five warm runs, Node 26 under
`vite-node`; the script is `Kit.bench.js` beside the code.

| op                                          | before the reduction |   after |
| ------------------------------------------- | -------------------: | ------: |
| seam, unbound                               |               1.8 ns |  1.5 ns |
| seam, bound, one layer                      |               6.2 ns |  6.4 ns |
| seam, bound, two layers                     |              86.6 ns | 78.6 ns |
| order, clean, three relations               |               468 ns |  294 ns |
| order, cycle refused                        |               5.6 µs |  2.8 µs |
| derive, 3 entries + 1 relation over 8 roles |               5.9 µs |  5.1 µs |

`derive` runs once per class at module load — three times in the chat's
lifetime. What a row pays per render is `seam` once per visible role, and
Vue's own vnode creation for one `<component :is>` is on the order of a
microsecond, so the kit is under 3% of a row's render.

## Bugs the substrate found when driven

None of these were visible in the unit specs; all three appeared the first
time the docs page was driven with Playwright after the compositor split.

- Every loaded message had no speaker, the gutter threw on the avatar
  letter, and the broken render froze the scroller's window so rows
  vanished on scroll. The page files on disk carry `role` because the
  sample generator wrote them before the rename; `ChatApi.page()` now
  adopts a record at the boundary, recursively, since 186 nested sub-thread
  messages carry it too. The index file has its own boundary in `index()`.
- A streaming reply did not grow on screen. The parts list received the
  same array object while it grew in place, and nothing in the list's
  render read the chat's revision — the row used to. The list's `parts`
  getter reads it now.
- Every row was up to 84 px taller than its content. A later stylesheet
  rule set `gap: 12px` on the row grid, which is a row gap as well as a
  column gap, and the grid pre-declared eight auto tracks; empty tracks
  still get their gaps. The gaps are column-only and the tracks are
  implicit.

The lesson is procedural: a change to the render path is not verified
until the page is driven.

## What remains open

- Composition across independent authors has been exercised by three
  variants from one author. The claim rests on the mechanism; a second
  author's plugin is the test that decides it.
- The dynamic-slot lever for one-off overrides at a usage site is designed
  and not built.
- Adding a part kind is a subclass of the list overriding `roleOf` with
  `super`, patched in through `MessagePartList: { namespace: PluginPartList,
subkit: { Image: … } }` — two named moves, explicit and typed. That is
  the accepted shape after dispatch-by-data was reverted.
- During a fast wheel burst the DOM briefly holds over a hundred rows
  before settling; the window widens while measurements land. It predates
  the kit and belongs to the scroller.
- Eighteen `vue-tsc` errors remain in `ChooseField`, the scroller and the
  props-contract example, files the kit work does not touch.
- The naming rule, the `$kit` return-type rule, `declare` widening and the
  `vue-tsc` invocation live in code, in this file and in LESSONS.md. The
  ivue skill and the malleability guide do not yet say them.

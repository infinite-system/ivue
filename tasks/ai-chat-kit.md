# The AI chat on the kit — the first malleable tree

Convert `examples/playground/src/examples/ai-chat/` from its two
registries (`Parts`, `Tools`) to the kit design settled on 2026-09-09:
every model carries `static get $kit`, a template names roles and never
components, the kit travels down as a prop, and every view still
constructs its own model — from the kit's entry for its role, so the
model class and the view are both swappable from one place. The design
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
  needs as `{ model, view }` pairs (a parent-owned child) or `{ view }`
  (a leaf that takes props). Lazy is what makes the model↔view import
  cycle harmless: nothing reads the other side at module init. A
  subclass extends by spread: `{ ...super.$kit, Scroller: { … } }`.
- **The kit travels as a prop.** A parent's template passes its kit to
  every child it composes — `<component :is="model.kit.Message.view" :kit="model.kit" :row="item" />`
  — and the child's model reads `get kit() { return this.props.kit ?? this.self.$kit }`.
  The child's own static is the default, the kit it was handed the
  override, so one override on `Chat`'s kit reaches every tool card
  below it, and a model constructed in a test with no kit falls back
  to its own. No inject, and no parent ever constructs a child.
- **Every view constructs its own model, as the standard says.** The
  SFC is the wiring: `defineProps`, one `new`, the destructure. What
  the kit adds is where the class comes from: the view constructs the
  kit's entry for its role, `new (props.kit ?? Default).Message.model(props)`,
  so a kit override can swap the model class as well as the view
  without either file changing. Lifecycle hooks in the constructor bind
  to the view's own component, exactly as today.
- **Templates name roles.** A child renders as
  `<component :is="model.kit.Message.view" :kit="model.kit" …props />`;
  a leaf the same way with its props. No shell component: the parent
  chose the entry, so it knows the view; the view knows the model.
- **State that outlives a view lives on the parent's model as data.**
  Expanded ids, the streaming reply's revision, the clock, the loaded
  pages all sit on `Chat` today and stay there; a row's view can mount
  and unmount freely because nothing it must remember lives on it.
  Ownership of models does not move; only the choice of class and view
  does.
- **Vapor-neutral.** Views are SFCs, seams are `<component :is>`, the
  models never touch the VDOM. Nothing here is a render function.

## The mapping

| today | after |
| --- | --- |
| `parts/Parts.ts` registry (kind → component) | `ChatMessage.$kit`: `Text`, `Thinking`, `ToolCall`, `ToolBatch`, `Attachment`, `System` — the row model resolves `kit[part.kind]` |
| `tools/Tools.ts` registry (name → component, prefix families, generic fallback) | `ToolCallModel.$kit`-level `Tools` map on `ChatMessage.$kit` with the same lookup as a method: `toolFor(name)`; each entry `{ model: BashCall.Class, view: BashCallView }` |
| `ToolHead.vue`, `ToolFoot.vue`, `CodeBlock.vue` used by name in every card | `ToolCallModel.$kit`: `Head`, `Foot`, `CodeBlock` as leaf entries; cards render `<component :is="model.kit.Head.view" :model="model" />` |
| `Chat.ts` reaches the scroller through `ref="scroller"` | unchanged: the scroller's view constructs its model and exposes it; the chat keeps its template ref. The entry `Chat.$kit.Scroller = { model: VirtualScroller.Class, view: VirtualScrollerView }` is what a page overrides to put a different scroller under the chat |
| `ChatComposer.vue`, `ChatIndex.vue` construct their models | unchanged in who constructs; they construct the kit's `Composer.model` / `Index.model` and receive `:kit` |
| `ChatMessage.vue` constructs a row model per row in the scroller's slot | unchanged; the slot renders `<component :is="chat.kit.Message.view" :kit="chat.kit" :row="item" :chat="chat" />` |
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
- **A view constructing from the kit** is the one new line in every
  view: `new (props.kit ?? Kit).Role.model(props)`. Check that a view
  mounted with no kit (a docs demo, a spec) still constructs the
  default, and that the gate's "one `new` in setup" reading accepts the
  indirection.
- **The generic fallback is a kit entry**, not a branch: `toolFor(name)`
  returns `kit.Tools[name] ?? kit.Tools.byPrefix(name) ?? kit.Tools.Generic`.
  The rule "rendering never branches on a name" survives; the lookup
  just moved onto the model.

## Verification checklist

- [ ] `npx vitest run examples/playground/src/examples/ai-chat`: every
      existing spec passes with its subject unchanged; no spec imports a
      `.vue` file except the kit-resolution spec.
- [ ] A spec constructs models with and without a `kit` prop and asserts
      resolution: a model with no kit uses its own static; a model
      handed a kit uses it; `toolFor` falls back to `Generic`.
- [ ] A subclass `FancyChat` overriding one entry of `$kit` (`Scroller`)
      renders the chat with the other scroller view and nothing else
      changed — the playground gets a second route to show it.
- [ ] A root-kit override of `CodeBlock` reaches every tool card without
      touching any tool class.
- [ ] The scroller is untouched: its suite, the horizontal scroller and
      the text marquee pass unchanged; the chat reaches it through the
      kit's `Scroller` entry and the same template ref as before.
- [ ] The browser drives from the plan (`tasks/ai-chat-scroller-plan.md`)
      pass unchanged: pages on demand, tool cards, index selection,
      streaming, the twelve-glide anchor drive at zero jerks.
- [ ] The gate adds no findings; the invariants checker binds the new
      "rendering is a kit" record; `npm run build:docs` passes.
- [ ] Bundle and mount cost measured before and after: the kit adds a
      lazy static per class and a prop per child, nothing per render.

## Impossibilities (what this build forbids)

- A template that names a component it composes.
- A parent that constructs a child's model.
- A view that constructs anything but its own model.
- A model that names its own view.
- A swap that needs a model class or a view edited.
- A child rendered without the kit its parent holds.
- A shell component between a parent and its child's view.

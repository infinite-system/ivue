# The AI chat on the kit — the first malleable tree

Convert `examples/playground/src/examples/ai-chat/` from its two
registries (`Parts`, `Tools`) and self-constructing views to the kit
design settled on 2026-09-09: every model carries `static get $kit`, a
template names roles and never components, a parent constructs its
children and hands its kit down, and a view is a projection over a model
it did not construct. The design itself is recorded in
`tasks/malleable-architecture.md` under "The kit"; this file is the build.

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
- **The kit flows down the object graph.** A parent constructs its
  children — `new this.kit.Message.model(props, this.kit)` — and a child
  reads `get kit() { return this.props.kit ?? this.self.$kit }`. The
  child's static is the default, the parent's kit the override, so one
  override on `Chat`'s kit reaches every tool card below it, and a model
  constructed in a test with no kit falls back to its own. No inject.
- **Templates name roles.** A parent-owned child renders as
  `<component :is="model.kit.Message.view" :model="message" />`; a leaf
  renders as `<component :is="model.kit.CodeBlock.view" :code=… />`
  with props. No shell component: the parent chose the pair, so it
  knows both halves.
- **Views are projections.** A view takes `model` as a prop and
  constructs nothing. The one exception is a view mounted on its own
  (a docs demo, a test): `props.model ?? new X.Class(props)`, one
  instance either way.
- **Lifetime decides the seam.** A child whose state must outlive its
  element (a message row, a tool call, the composer, the index, the
  scroller) is parent-owned and crosses the seam as a model. A leaf
  whose state lives and dies with its element (a code block, an
  attachment figure, the tool head) crosses as props and constructs its
  own small model in setup, as today.
- **DOM lifecycle stays with the view.** A parent-owned model's
  constructor runs in the parent's setup, so `onMounted` there binds to
  the parent. Anything that needs the element — the text part colouring
  its fences, the code block colouring itself — stays in the view or
  becomes `model.attach(element)` called from the view's own mount.
- **Vapor-neutral.** Views are SFCs, seams are `<component :is>`, the
  models never touch the VDOM. Nothing here is a render function.

## The mapping

| today | after |
| --- | --- |
| `parts/Parts.ts` registry (kind → component) | `ChatMessage.$kit`: `Text`, `Thinking`, `ToolCall`, `ToolBatch`, `Attachment`, `System` — the row model resolves `kit[part.kind]` |
| `tools/Tools.ts` registry (name → component, prefix families, generic fallback) | `ToolCallModel.$kit`-level `Tools` map on `ChatMessage.$kit` with the same lookup as a method: `toolFor(name)`; each entry `{ model: BashCall.Class, view: BashCallView }` |
| `ToolHead.vue`, `ToolFoot.vue`, `CodeBlock.vue` used by name in every card | `ToolCallModel.$kit`: `Head`, `Foot`, `CodeBlock` as leaf entries; cards render `<component :is="model.kit.Head.view" :model="model" />` |
| `Chat.ts` reaches the scroller through `ref="scroller"` | `Chat.$kit.Scroller = { model: VirtualScroller.Class, view: VirtualScrollerView }`; the chat constructs and holds the scroller model, reads `visibleIndex`, calls `scrollToIndex` on it directly; the view takes `model` |
| `ChatComposer.vue`, `ChatIndex.vue` construct their models | `Chat` constructs `Composer` and `Index` with its kit; the views project them |
| `ChatMessage.vue` constructs a row model per row in the scroller's slot | `Chat` keeps a map id → row model, constructed on first render (the window bounds it to a few dozen live instances); the slot renders `<component :is="chat.kit.Message.view" :model="chat.rowModel(item)" />` |
| `SubThread.vue` constructs | a nested thread is rows of the same kind, from the same map |

Every current test keeps its subject: the classes' logic does not move.
What changes is who constructs, and that the views stop importing each
other.

## Friction to learn from (the reason the chat goes first)

- **The scroller's SFC constructs its own model** and exposes it through
  `defineExpose`. Making it a view over a `model` prop is the one change
  outside the chat folder, and it is the change the whole design
  depends on: a parent-owned scroller is what lets the chat drop the
  template ref, and what lets a page swap the scroller's view without
  touching its class. The scroller's own example and the horizontal
  scroller keep working through the standalone fallback.
- **Row models outlive their views.** Expanded state, the streaming
  reply's revision, the clock all already live on `Chat`; the row model
  becomes a thin projection holder. Check that a row scrolling out and
  back gets the same model (the map guarantees it) and that memory stays
  bounded (prune models for rows outside the window plus a margin, the
  same rule as pages).
- **The generic fallback is a kit entry**, not a branch: `toolFor(name)`
  returns `kit.Tools[name] ?? kit.Tools.byPrefix(name) ?? kit.Tools.Generic`.
  The rule "rendering never branches on a name" survives; the lookup
  just moved onto the model.

## Verification checklist

- [ ] `npx vitest run examples/playground/src/examples/ai-chat`: every
      existing spec passes with its subject unchanged; no spec imports a
      `.vue` file except the kit-resolution spec.
- [ ] A spec constructs the whole chat graph (`Chat` → rows → tool
      calls) with no component mounted, and asserts `kit` resolution:
      a child with no kit uses its own static; a child handed a kit uses
      the parent's; `toolFor` falls back to `Generic`.
- [ ] A subclass `FancyChat` overriding one entry of `$kit` (`Scroller`)
      renders the chat with the other scroller view and nothing else
      changed — the playground gets a second route to show it.
- [ ] A root-kit override of `CodeBlock` reaches every tool card without
      touching any tool class.
- [ ] `VirtualScroller.vue` takes `model` as a prop; the scroller
      example, the horizontal scroller and the text marquee still pass
      their suites and the standalone fallback constructs when no model
      is given.
- [ ] The browser drives from the plan (`tasks/ai-chat-scroller-plan.md`)
      pass unchanged: pages on demand, tool cards, index selection,
      streaming, the twelve-glide anchor drive at zero jerks.
- [ ] The gate adds no findings; the invariants checker binds the new
      "rendering is a kit" record; `npm run build:docs` passes.
- [ ] Bundle and mount cost measured before and after: the kit adds a
      lazy static per class and a prop per child, nothing per render.

## Impossibilities (what this build forbids)

- A template that names a component it composes.
- A view that constructs the model it shows, except the standalone
  fallback.
- A model that names its own view.
- A swap that needs a model class edited.
- A child rendered with a kit its parent did not hand it, when the
  parent has one.
- A shell component between a parent and its child's view.

# AI chat — Invariants

The load-bearing truths the chat example descends from: what the parser
joins, where loading lives, what the scroller may and may not know, how
rendering is chosen, how waiting is timed, and what a selection is. Every
class in this folder is a consequence of one of these; change the system
here first and let the code follow.

The scroller-level invariants (geometry, the promise of an item, the
reader owning the scroll) live in
`../virtual-scroller/virtual-scroller.invariants.md`. The chosen
disciplines below stand on those reality invariants, never the reverse.

---

# Chosen invariants — disciplines; hold them consistently

## A tool result joins its call

A `tool_result` block names a `tool_use` id; the parser attaches the
result, its structured payload and its duration to that call, and the
user record that carried the result produces no message of its own. An
assistant turn that arrives as several records sharing one message id is
one message with its blocks in order. Bookkeeping records (mode,
snapshots, attachments, titles, ledgers) produce nothing.

## A batch is two or more

A run of tool calls with no text between them — inside one turn, or
across consecutive tool-only turns — contracts to one batch. A single call
is never wrapped. The batch and each call keep their own open state on the
chat, by id, so collapsing one never resets the other.

## Loading lives above the scroller

The scroller's contract with data is `items.length` and `items[index]`.
The chat hands it one row per message from the index file on, and fills a
row's content only when the rendered window reaches its page (one page of
margin each side, never a page twice). A stub renders at the scroller's
estimated item size, so a page landing above the viewport moves nothing;
the scroller never learns that a row is unloaded.

## The reader owns the scroll

A streaming reply re-pins the last row only while the reader is at the
bottom (within the threshold of the end). The first scroll away releases
the pin; a "latest" chip brings it back. A seek from the index lands the
message readable, never cut at the edge.

## Rendering is a kit

Every model that composes declares its roles as `static get $kit()`, a
record of entries — a part per kind on the row, a card per tool name on
the part that picks cards, the sections of the row, the leaves of a card
— and every seam renders `<component :is="model.kit.Role.vue" :kit="model.kit.Role" …props />`.
A model reads its kit from its own class, so a subclass swaps any role
by naming another entry, and nothing branches on a kind or a name — it
looks the entry up, with the generic card and the text part as the
fallbacks — so a record the parser has not seen never breaks the page.
The mechanism and its proofs: `../../kit/kit.invariants.md`.

## Full granularity in two clicks

A batch opens to its calls; a call opens to its full input and full
result, coloured by kind, capped only by a cap the reader can lift with
"show everything". Nothing is truncated beyond the sample's own cut
marker. Expanded state survives a row scrolling out and back.

## One clock, held while pending

Every elapsed label is a getter over one `now` the chat owns. The
interval runs only while something holds the clock — a pending page, a
thinking span, a running call, a streaming reply — and stops when the
last holder releases. A finished thing's label is its recorded duration,
frozen; nothing ticks after its part is done.

## The projection is the rendered text

`selectionText(row)` returns the plain text the rendered row shows —
markdown reduced with block boundaries as newlines, a tool call as its
collapsed line, a batch as its count and names — so a copy that crosses
the window boundary reads the same as a copy inside it. An expanded card's
inner text is a known exception: it is read from the DOM while mounted and
not projected once unmounted.

## Selection is a set of ids

The index keeps selected message ids plus an anchor. A click picks one
and anchors; shift-click selects the range between the anchor and the
click in the current filtered order; ctrl or cmd-click toggles without
moving the anchor. Changing a filter never loses a pick. Export leaves in
thread order, whatever order the picks were made in, after loading the
pages the selection needs.

## Configuration is a layer

`Chat` reads nothing but its own props: its theme, density and tree are
getters returning the shipped defaults. `ConfiguredChat` is the layer that
opens them — one getter each, reading the kit entry's props, then the
page's settings, then `super` — and the root binds whatever the layer
says. Precedence is inheritance order; a tree the reader picks is a
`Kit.Class.derive` over the configured chat, and the shipped classes never
learn that a settings panel exists.

## Nothing leaves the tab

A typed message, an attachment, an opened session file: none of it is
sent anywhere. Replies are replays of real turns from the loaded thread.
The shipped sample is scrubbed at build time and the build refuses a page
in which a forbidden pattern survives; a reader's own file goes through
the same rules before a character renders.

---

## Impossibility boundary — what these invariants forbid

If the invariants hold, none of these can exist in a correct state:

- a page requested that no window needs, or requested twice
- the scroller knowing that a row is unloaded, or a placeholder measured
  at a size other than the estimate
- a streaming reply moving the viewport while the reader is away from
  the bottom
- a batch that holds one call, or one that hides a call more than two
  clicks deep
- a renderer that branches on a tool name instead of looking it up, or a seam that names a component instead of an entry
- a timer per row, or a counter that ticks after its part is done
- a copy whose text differs between a mounted and an unmounted row
- a selection lost by changing a filter, or an export out of thread order
- a secret, an email or a home path in the shipped sample
- an attachment, a prompt or a session file leaving the browser

A change that introduces any of the above is breaking an invariant, not
adding a feature — re-derive from here before writing it.

# AI chat on the virtual scroller

A long-context chat example for ivue.dev: a real Claude Code session of
tens of thousands of records, rendered as a conversation that streams
replies, loads its history on demand, jumps anywhere instantly, expands
every tool call to its full code and output, copies cleanly, and carries
a filterable, selectable index of every message in a side panel. On top
of the playground's `VirtualScroller`, with ivue classes owning
everything above geometry.

Status: plan. Nothing here is built yet.

## Why

Most chat interfaces render the whole thread into the DOM and load the
whole thread as one JSON body. Past a few thousand messages both stall.
The scroller already solves the first; the chat class solves the second.
The page states the receipt live: messages in the thread, rows in the
DOM, bytes fetched so far. It is also a worked example of a dependency
between two ivue classes (chat over scroller), beside the post player.

## What exists

- `examples/playground/src/examples/virtual-scroller/VirtualScroller.ts`:
  variable heights measured through a ResizeObserver, prefix sums over
  measured-or-assumed sizes, a running average for unmeasured rows
  (`estimatedItemSize`), bottom clamp, `scrollToIndex`, a reactive
  rendered window (`visibleItems`, `visibleIndex`).
- `VirtualScrollerSelection.ts`: a logical selection over the data
  (item index + character offset), highlight re-pinned on mounted rows,
  copy assembled from every row in the range through `rowText(index)`:
  the mounted row's DOM, or the `selectionText` prop for unmounted rows.
  Copy emits `text/plain` only. Specs: `docs_v2/examples/virtual-scroller-specs.md`,
  invariants beside the code.
- The docs site is static. No model runs behind it.
- Claude Code writes every session as JSONL under
  `~/.claude/projects/<project>/<session>.jsonl`. This session's file is
  81,845 records and 577 MB; a small one is a few hundred records. That
  is the real shape of a long-context chat, and it is the data source.

### The JSONL shape (measured on real sessions)

One JSON record per line. Record `type`s that carry the conversation:

- `user`: `message.content` is a string (a typed prompt) or a list of
  blocks, almost always one `tool_result` (`tool_use_id`, `content` as a
  string or a list of text/image blocks, `is_error`). A tool-result
  record also carries `toolUseResult`, the structured result the tool
  produced (Bash: `stdout`, `stderr`, `interrupted`; Edit and Write: the
  file path and the patch; Read: the file content), which is what the
  expanded tool card renders. Flags: `isCompactSummary`, `isMeta`,
  `isSidechain`, `parentUuid`, `timestamp`, `uuid`.
- `assistant`: `message.content` is a list of blocks, `thinking`
  (`thinking`, `signature`), `text`, `tool_use` (`id`, `name`, `input`).
  One API turn arrives as several records sharing `message.id`, one per
  block (`apiBlockIndex`); `message.model`, `usage` (input, output,
  cache read and creation tokens), `stop_reason`, `requestId`.
- `system`: `subtype` such as `turn_duration` and `stop_hook_summary`,
  with `durationMs`; shown as quiet dividers, filtered by default.
- Everything else is session bookkeeping and is dropped: `mode`,
  `permission-mode`, `attachment`, `file-history-snapshot`,
  `file-history-delta`, `last-prompt`, `queue-operation`, `ai-title`,
  `bridge-session`, `atis-latch`, `history-suppression`, `cost-state`,
  `frame-link`, and the artifact ledgers. In the 577 MB file they are
  about a third of the records and most of the bytes.
- Threading: `parentUuid` links records into a tree; `isSidechain`
  marks subagent threads. Tool names in this session, most frequent
  first: Bash, Edit, Read, Write, the Playwright MCP tool, Artifact,
  ToolSearch, TaskUpdate, Agent, Skill, WebFetch, TaskCreate.

## Decisions

1. **Loading lives in the chat class, not in the scroller.** The
   scroller's contract with data is `items.length` and `items[index]`;
   it never needs content to place a row. Nothing is added to it for
   loading.
2. **Unloaded messages are stubs sized to the estimated item size.** A
   placeholder measured at the running average does not move the
   average, so pages arriving never move the scrollbar or the seek.
3. **The reader owns the scroll.** Stick to bottom only while the reader
   is at the bottom; release on the first upward scroll; a "jump to
   latest" chip brings it back. Same invariant as the post player.
4. **History prepends without a jump**, anchored on item identity, never
   on scrollTop.
5. **The data is a real session, scrubbed.** The shipped sample is
   built from real Claude Code JSONL by a script that keeps the
   conversation records, drops the bookkeeping, scrubs secrets, emails
   and home paths, and truncates giant tool outputs with a visible
   marker. The page also opens the reader's own `.jsonl` from disk,
   parsed in the browser, never uploaded. Replies to a typed message are
   still scripted, and say so: they are stitched from real assistant
   turns of the sample, replayed as a stream with tool calls resolving
   in place. The claim is about the list, not the model.
6. **The composer is a real composer.** A model picker, attachments by
   drop or pick, and a send that triggers a reply with tool calls that
   load in place. All mocked, all local, nothing leaves the browser.
7. **A message is a list of parts, and parts change height.** Text,
   tool call, attachment, image. A tool call renders pending, then
   running, then done with its result folded; each step grows the row
   and the scroller remeasures it. That growth is the demo's point, so
   it is exercised on purpose, not avoided.
8. **Selection measures and copies against rendered text, blocks
   included.** One contained change in the selection class: `innerText`
   instead of `textContent` for the row's text and the offset walk, so a
   copied message keeps its paragraph breaks. Plain text stays the only
   clipboard format.
9. **The chat's text projection is the renderer's twin.** `selectionText(message)`
   must return exactly the mounted row's rendered text, or a copy that
   crosses the window boundary changes wording halfway. Tested per
   message kind.
10. **A tool call expands fully.** Collapsed: one line, the tool name
    and its first argument. Expanded: the whole input and the whole
    result, code formatted by kind (a Bash command and its output, an
    Edit as a diff, a Read or Write as the file with line numbers, JSON
    for everything else), highlighted with shiki, with no truncation
    beyond what the scrub script left in the data.
11. **Waiting is shown, and timed, from one clock.** Thinking, a
    running tool call, a streaming reply and a page being fetched each
    get a loader with a live elapsed counter that reads 1s, 2s, 3s, then
    1m 04s, and freezes into a receipt when done ("thought for 1m 12s",
    "ran 4.8s", "page 213 in 240ms"). All counters derive from one
    ticking clock the chat owns, which ticks only while something is
    pending; no row runs a timer of its own.
12. **Consecutive tool calls contract to a batch.** A run of tool
    calls with no text between them renders as one batch row: a count,
    the tool icons in order, the total time, and the outcome. The batch
    expands to its calls, each call expands to its full card, and the
    two levels are independent, so full granularity is always two
    clicks away and a long agentic stretch never floods the thread.
13. **One component per record kind and per tool.** Every part and
    every tool has its own component and its own ivue class, chosen
    through a map, so a new tool or a new record kind is a new file,
    not a branch in a shared renderer.
14. **The index is a second scroller over the same items.** A right-hand
    panel lists every message as one truncated line, filtered by role
    and by whether tool calls are included, searchable, with click
    selection, shift-click range selection, and export of the selection.
    Selection is a set of message ids, so filters never lose it.

## Design

### `SessionLog` (the parser, a class with statics)

- `parse(lines)`: JSONL records in, `Message[]` out, streaming-friendly
  (a line at a time, so the browser can parse a 500 MB file from disk
  without holding it as one string).
- Keeps `user`, `assistant`, `system`; drops the rest. Merges assistant
  records that share `message.id` into one message with its blocks in
  `apiBlockIndex` order. Joins each `tool_result` to its `tool_use` by
  id into one `tool_call` part on the assistant message, carrying the
  structured `toolUseResult`. A user record whose content is a string
  becomes a user message; one holding only tool results produces no
  message of its own.
- Thinking blocks become a `thinking` part, collapsed by default.
  Compaction summaries (`isCompactSummary`) become a system divider.
  Sidechains (`isSidechain`) fold under the `Agent` call that spawned
  them.
- Each message keeps `uuid`, `parentUuid`, `timestamp`, `model`,
  `usage`, and its index in the conversation.
- `scrub(record)`: the same rules the build script uses, applied again
  in the browser to a reader's own file before anything renders: emails,
  bearer and key-shaped tokens, `Authorization` headers, the home
  directory to `~`.

### The sample (build script, `docs_v2/scripts/chat-sample.mjs`)

- Input: a real session file chosen for variety (long Bash outputs,
  Edits, Reads of large files, an Agent sidechain, a compaction, image
  tool results). Output: `docs_v2/public/examples/chat/sample/` as
  `meta.json` (count, models, byte sizes) plus numbered page files of
  200 messages each, which is what the mock API serves.
- Scrub rules live in one module shared with `SessionLog.scrub`. Tool
  outputs over 64 KB are cut in the middle with a marker line stating
  how many bytes were removed. The script prints what it scrubbed, by
  rule and count, and the build fails if a key-shaped string survives.
- The committed sample is reviewed once by hand before it ships. It is
  public data the moment it is pushed.

### `Chat` (ivue class, owns the thread)

- State: `total` (message count from the API), `items` (a shallow array
  of length `total`; stubs `{ id, pending: true }` until loaded),
  `pages` loaded, `streaming` message, `atBottom`, request log, bytes.
- Watches the scroller's rendered window and fetches the pages covering
  it plus a margin of one page each side. Replaces stubs in place. Never
  fetches a page twice; in-flight pages are remembered.
- Streaming: appends a message, then grows its body from the generator.
  The scroller remeasures the growing row on its own; the class only
  re-asserts the bottom while `atBottom`.
- Prepend: when the reader reaches the top of the loaded range, loads
  the previous page. Items before the viewport are replaced in place by
  index, so identity holds and nothing visible moves.
- `selectionText(message)`: the plain-text projection of the rendered
  markdown, with block boundaries as newlines. The same function feeds
  the renderer's text nodes, so the two cannot drift.
- Streaming consumes `ChatApi.stream` events: a token extends the last
  text part; a `tool_call` appends a tool part in the pending state; a
  `tool_result` resolves it by id; an `attachment` appends an attachment
  part. The reply's model is the composer's pick at send time.
- The clock: one `now` ref advanced by a single interval (250ms) that
  starts when any part or page enters a pending state and stops when
  the last one leaves it. Every elapsed label is a plain getter over
  `now` minus the part's `startedAt`, so a thousand pending-looking
  rows cost one timer. Replayed history uses the real timestamps in
  the records, so a thinking block from the sample shows the time the
  model actually took.
- Receipts as getters: `domRowCount`, `bytesFetched`, `requestCount`,
  `messageCount`, `tokensStreamed`, shown in a header strip.

### `ChatApi` (the mock, a class with statics)

- `count(threadId)`, `page(threadId, index, size)` with a latency model
  (jitter, an occasional slow page) and a byte size per page so the
  transfer counter is honest. Deterministic from a seed, so the demo
  reads the same every visit and the tests are reproducible.
- `models()`: a short list of mock models, each with a label, a token
  rate, a first-token latency, and a context window shown in the picker
  (for example a fast small one, a slow thorough one, a long-context
  one). The picker changes how a reply streams, so the difference is
  visible, and the model name stamps each reply.
- `stream(request)`: an async generator of events, not tokens:
  `token`, `tool_call` (name, input), `tool_result` (id, payload,
  duration), `attachment`, `done`. A reply to a typed message is a real
  assistant turn from the sample, chosen by a keyword match against the
  draft and otherwise at random, replayed with the picked model's token
  rate: its text streams, its tool calls appear pending and resolve
  after a delay proportional to their real `durationMs`, so rows visibly
  grow while pinned to the bottom. The reply is labelled as a replay.
- `open(file)`: the reader's own session. Reads the `File` as a stream
  of lines through `SessionLog`, builds pages in memory, and swaps the
  thread. Nothing leaves the browser; the receipts strip says so.
- `upload(file)`: the attachment mock. Returns an id, a display name, a
  size, and for images the natural width and height (read from the file
  locally through an object URL). Nothing is sent anywhere; the object
  URL is the source until the page is left.

### `Composer` (ivue class, owns the input row)

- State: `draft`, `model` (the picked model id), `attachments` (pending
  and ready), `sending`.
- Drop, paste, or pick adds attachments through `ChatApi.upload`; each
  shows as a chip with a thumbnail for images and a name and size for
  files; a chip removes on click.
- Send appends the user message with its parts (text plus attachments),
  clears the composer, and hands `Chat` the request `{ model, text,
  attachments }`. Enter sends, Shift+Enter breaks a line. The model
  picker is a Quasar-free native select styled by the theme, since the
  docs site does not ship Quasar.

### Message rendering

- Rendering is a registry, not a switch. `Parts.map` maps a part kind
  to a component, and `Tools.map` maps a tool name to a component;
  each component is an ivue class plus a wiring SFC per the standard,
  under `examples/playground/src/examples/ai-chat/parts/` and
  `.../tools/`. Unknown kinds and tools fall to a generic component
  that renders input and result as JSON, so the parser never throws on
  a record it has not seen.
- Kinds: user, assistant, system. A message is a list of parts:
  - `text`: the markdown subset the press already renders (paragraphs,
    lists, quotes, code fences, inline code, links, images). Code blocks
    highlighted with shiki at render.
  - `tool_batch`: a run of two or more tool calls with no text or
    thinking between them, built by the parser. Collapsed: one line
    with the count ("7 tool calls"), the tools' icons in order, the
    combined time, and a mark if any failed. Expanded: the calls as
    their collapsed lines; each expands on its own to the full card.
    The batch remembers its own open state and each call's, by id,
    so the two levels never reset each other. A single tool call is
    never wrapped in a batch.
  - `tool_call`: collapsed, one line: an icon for the tool, its name,
    and its first argument (the Bash command's first line, the file path
    of an Edit, Read or Write, the prompt's first words of an Agent),
    the state (pending, running, done, failed) and the elapsed time.
    Expanded, a card with the full input and the full result, rendered
    by the tool's own component:
    - `BashCall`: the command as a shell block; stdout and stderr as
      terminal blocks with ANSI stripped, the exit state marked.
    - `EditCall`: a unified diff of old against new with the file path
      as its header, highlighted by the file's language.
    - `ReadCall` and `WriteCall`: the file with line numbers,
      highlighted by extension; Read shows the offset and limit it was
      called with.
    - `AgentCall`: the sidechain folded under it, as a nested thread
      rendered by the same parts.
    - `SkillCall`, `WebFetchCall`, `ArtifactCall`, `TaskCall`: a header
      with the one argument that matters (the skill name, the URL, the
      artifact title, the task subject) and the result as text.
    - `McpCall`: the server and tool from the name, input and result
      as JSON; a Playwright call shows its screenshot when the result
      carries an image.
    - `GenericCall`: the input as pretty JSON and the result as text or
      JSON, whichever it is; the fallback for any name not in the map.
    A "show everything" control drops the card's own length cap; only
    the scrub script's marker remains. Opening a card grows the row and
    the scroller remeasures it like any other growth; expanded state is
    kept per tool-call id so a row that scrolls out and back keeps it.
  - `system`: its own component per subtype: a compaction summary as a
    divider with the summary folded under it, a turn duration as a
    quiet timestamp line, a hook summary as a small card.
  - `user`: the prompt as markdown, with attachments; a user record
    that is a tool result never becomes a part of its own.
  - `thinking`: while pending, a loader with the live counter
    ("thinking · 47s"); done, folded to one line with the duration and
    the length ("thought for 1m 12s · 2.1k chars"); expands to the text.
  - Loaders: a running tool call shows a spinner in its icon slot and
    the counter beside the name; a streaming text part ends in a caret
    that blinks only while tokens arrive; a page being fetched renders
    its stubs with a shimmer at the estimated size and the counter in
    the first stub of the page; a reply that is waiting for its first
    token shows the model name with the counter. All of them are the
    same three states (pending, running, done) drawn four ways, and all
    of them read the shared clock.
  - `attachment`: an image at its natural aspect, or a file chip with
    name, size and type.
- Assistant replies carry the model label and, once done, the token
  count and the wall time, so the picker's effect is legible.
- A stub renders as a placeholder at exactly the estimated item size.
- Images carry width and height, so a late load never remeasures.
- The `selectionText` twin covers every part: a tool call projects to
  `tool: <name>` plus its result text when open; an attachment to its
  name.

### `Index` (ivue class, the right-hand panel)

- A drawer on the right of the chat, opened by a button in the header
  strip, resizable by its edge, remembering its width; on narrow
  viewports it covers the chat and closes on Escape.
- A second `VirtualScroller` over the same message ids. One row per
  message: a role mark, the time, and the text truncated to one line
  (for an assistant message with only tool calls, the tool names). The
  row the chat is showing is marked; clicking a row seeks the chat to
  that message through the same readable landing as search.
- Filters in the panel's header: role (user, agent, both), tool calls
  (include, exclude, only), and a text search over the projected text.
  Filters produce an ordered id list; the scroller renders that list,
  so the index shrinks and grows without the chat noticing.
- Selection is a `Set` of message ids plus an anchor id. Click selects
  one and sets the anchor. Shift-click selects every row between the
  anchor and the clicked row in the current filtered order, so a batch
  is two clicks. Ctrl or Cmd-click toggles one without moving the
  anchor. A checkbox per row does the same as click; a header checkbox
  selects or clears everything the filter shows. Selected rows in the
  index and their messages in the chat share a highlight, and the
  header shows the count.
- Export: the selection as Markdown (role headers, tool calls as fenced
  blocks), as plain text, or as JSONL of the original records, in the
  conversation's order regardless of the order they were clicked. The
  file downloads from the browser; nothing is uploaded. The header
  offers copy to clipboard for the Markdown form as well.
- Keyboard: up and down move the focused row, Space toggles it, Shift
  with the arrows extends the range, Enter seeks the chat to it.

### Selection changes (in the scroller's selection class)

- `rowText(row)` and `leadingWhitespaceLength` move to `innerText`; the
  offset walk stays over text nodes but block boundaries count one
  newline, matching `innerText`.
- The invariant "the copied text is the string the row renders" gains
  the block case in `virtual-scroller.invariants.md`, with a test that
  copies across a paragraph break and a code fence.

### Page and post

- `docs_v2/examples/ai-chat.md` with the live demo and the receipts
  strip; source tabs through `LazyCodeGroup`.
- A blog post per the write-article skill, title first, with the
  measured numbers: thread size, DOM rows, bytes fetched to read a
  given page, time to jump from first to last message.

## Order of work

0. `SessionLog` parser and the scrub module, tested on a small real
   session (record counts, merged turns, joined tool calls, a sidechain,
   a compaction). The sample build script, run once, output reviewed.
1. `ChatApi` mock serving the sample pages with the latency and byte
   model; unit tests.
2. `Chat` class over the scroller: stubs, window-driven paging, prepend
   without jump, stick-to-bottom rule; unit tests with a fake scroller.
3. Streaming replies and the growing last row; the event stream with
   tool calls resolving in place.
3a. `Composer`: model picker, attachments through the upload mock,
    send; the user message with parts.
4. Selection: `innerText` change, block-boundary offsets, tests; the
   `selectionText` twin test per message kind.
4a. The part and tool registries with the generic fallbacks first;
    then one component per tool: Bash, Edit diff, Read and Write with
    line numbers, Agent sidechain, Skill, WebFetch, Artifact, Task,
    MCP; the "show everything" control; expanded state by id.
4a'. Tool batches: the parser groups runs, the batch component with
     its two levels of expansion and its own remembered state.
4b. `Index`: the drawer, the second scroller, filters, click and
    shift-click selection, export in three forms, keyboard.
4c. Open your own `.jsonl`: streaming parse from a `File`, scrub in the
    browser, swap the thread.
5. The example page, the receipts strip, a screenshot in both themes.
6. Measurements and the post.

## Verification checklist

- [ ] A 50,000-message thread opens with one count request and one
      page; the DOM holds only the rendered window plus overscan.
- [ ] Scrolling anywhere fetches only the pages covering the window;
      no page is fetched twice; the request log shows it.
- [ ] Pages arriving above the viewport do not move the visible message
      by a pixel (measured, not eyeballed).
- [ ] A streaming reply keeps the bottom pinned while the reader is at
      the bottom and stops pinning on the first upward scroll.
- [ ] Every loader shows a counter that advances once a second and
      rolls into minutes; when the part completes the counter freezes
      into its receipt and never ticks again; with nothing pending, no
      interval is running (checked through the test clock).
- [ ] Replayed thinking blocks show the duration from the record
      timestamps, not from the replay.
- [ ] Typing a message and sending it produces a reply whose tool calls
      appear pending, resolve in place, and grow the row without the
      bottom pin losing the last line; opening a result disclosure
      remeasures the row and nothing above it moves.
- [ ] Switching the model changes the reply's first-token latency and
      token rate as advertised in the picker, and the reply is stamped
      with the model.
- [ ] Dropping an image and a file into the composer shows chips; the
      sent message renders the image at its natural aspect with no late
      remeasure, and the file as a chip; removing a chip before send
      drops it. No network request is made for an attachment.
- [ ] Jump to message N from either end lands it readable in one seek.
- [ ] Copy across two paragraphs, a list, and a code fence keeps the
      breaks; copy across the window boundary reads the same as a copy
      inside it.
- [ ] `selectionText` equals the rendered row text for every message
      kind in the fixture thread.
- [ ] The scroller's own test suite and invariants check pass unchanged
      apart from the block-text invariant added on purpose.
- [ ] The sample builds from a real session with the scrub report
      printed; grep of the output for `@`, `sk-`, `Bearer`, the home
      path and `ADMIN_SECRET` finds nothing; one reviewer has read it.
- [ ] `SessionLog` on a small real session yields the expected message
      count, merges every multi-record assistant turn, joins every tool
      result to its call, folds the sidechain, and marks the compaction.
- [ ] A run of tool calls with nothing between them renders as one
      batch row with the right count and combined time; a single call
      never does; expanding the batch shows the calls collapsed;
      expanding one call shows its card; collapsing the batch and
      reopening it keeps each call's own state.
- [ ] Every tool name in the sample resolves to a component through the
      map, and a made-up name resolves to the generic one without an
      error; every record kind likewise.
- [ ] Every tool call expands to its full input and result; a Bash call
      shows command, stdout and stderr; an Edit shows a diff; a Read
      shows numbered lines; "show everything" removes the card's cap;
      collapsing and re-expanding after scrolling out keeps the state.
- [ ] The index lists every message, filters by role and tool calls,
      searches, and seeks the chat on click; shift-click selects the
      range between anchor and click in filtered order; ctrl-click
      toggles; the header checkbox selects the filtered set.
- [ ] Export of a selection produces Markdown, plain text and JSONL in
      conversation order; JSONL re-parses to the same messages.
- [ ] Opening a 500 MB session from disk parses as a stream without the
      tab running out of memory, and no request leaves the page.
- [ ] `npm run build:docs` passes; the page renders in both themes.

## Impossibilities (what this design forbids)

- A request for a page the window does not need.
- A placeholder whose measured height differs from the estimated size.
- A copy whose text differs between a mounted and an unmounted row.
- A programmatic bottom-pin that fights a reader scrolling up.
- The scroller knowing that a row is unloaded.
- An attachment or a prompt leaving the browser.
- A tool result that changes a row above the viewport.
- A secret, an email, or a home path in the shipped sample.
- A tool output rendered as HTML rather than as escaped text or code.
- A selection that is lost by changing a filter.
- An export whose order differs from the conversation's.
- A timer per row, or a counter that ticks after its part is done.
- A renderer that branches on a tool name instead of looking it up.
- A batch that hides granularity: any call is reachable in two clicks.

---
title: 'Example: AI Chat on the Virtual Scroller'
description: 'A real 10,000-message Claude Code session as a chat: history fetched a page at a time, tool calls that expand to their code, streaming replies, and a filterable index that selects and exports — every piece an ivue class over the virtual scroller.'
aside: false
pageClass: benchmarks-wide examples-page
relatedPosts: [a-million-rows-twelve-divs, select-text-across-a-million-rows]
---

<script setup>
import LazyCodeGroup from '../.vitepress/theme/components/LazyCodeGroup.vue'
import ExampleAiChat from '../.vitepress/theme/components/examples/ExampleAiChat.vue'
</script>

# AI chat: a real 10,000-message session

Most chat interfaces do two things that stop working past a few thousand
messages: they render the whole thread into the DOM, and they load the
whole thread as one JSON body. This page does neither. The conversation
is a real Claude Code session, 82,000 records on disk, parsed and scrubbed
into 10,350 messages. The page fetches a 1 MB index first, so every
message is a row from the start, and it fetches a message's content only
when the scroller's window reaches its page. Watch the receipts strip as
you scroll: the DOM holds a few dozen rows, and the bytes fetched stay
proportional to what you read.

Everything above geometry is an ivue class: the thread and its paging,
the composer, the index, one class per message part and one per tool.
The scroller underneath is the same production class as the
[million-row example](/examples/virtual-scroller); it never learns that a
row is unloaded.

<ClientOnly>
  <ExampleAiChat />
</ClientOnly>

## What to try

- **Scroll anywhere.** Unloaded rows render as placeholders sized to the
  scroller's running estimate, so a page arriving above the viewport does
  not move the row you are reading. The request log in the strip names
  each page, its bytes and its time.
- **Expand a tool call.** A run of tool calls contracts to one batch row;
  the batch opens to its calls, and each call opens to its full input and
  output — a shell command with stdout and stderr, an edit as a diff, a
  file read with line numbers, a subagent with its whole thread. Nothing
  is truncated beyond the sample's own cut marker, and "show everything"
  lifts the card's cap.
- **Type a message.** The reply is a replay of a real assistant turn from
  the session, streamed at the picked model's pace: thinking with a live
  counter, tokens, tool calls that start and resolve in place while the
  bottom stays pinned — until you scroll up, when it stops pinning.
- **Open the index.** Every message on one line, filtered by role and by
  whether it holds tool calls, searchable. Click selects, shift-click
  selects a range, ctrl-click toggles; the selection survives a filter
  change, and exports as Markdown, plain text or JSONL in thread order.
- **Open your own session.** Any `~/.claude/projects/*/*.jsonl` parses as
  a stream in this tab, through the same scrub the sample went through.
  Nothing is uploaded.
- **Select and copy across the fold.** Drag a selection past the bottom
  edge and copy: the selection is a range over the data, so it reaches
  rows the DOM never held at the same time.

## The shape

One index, many pages. The index (`index.json`) carries one small row per
message: id, role, a preview, the tool count, the time. It is what the
side panel filters and what the chat renders as stubs. Content pages of
200 messages are fetched when the window reaches them, one page of margin
on each side, never twice.

A message is a list of parts: text, thinking, a tool call, a batch of
tool calls, an attachment, a system record. Rendering is a registry, not
a switch: a part kind names its component, a tool name names its card,
and a name nobody mapped falls to a generic card, so a record the parser
has not seen never breaks the page.

One clock. Every loader's elapsed label is a getter over one ticking
`now`, and the interval runs only while something is pending. A thousand
pending-looking rows cost one timer, and a counter never ticks after its
part is done.

<LazyCodeGroup
  :files="[
    { path: 'examples/playground/src/examples/ai-chat/Chat.ts', label: 'Chat.ts' },
    { path: 'examples/playground/src/examples/ai-chat/SessionLog.ts', label: 'SessionLog.ts' },
    { path: 'examples/playground/src/examples/ai-chat/ChatApi.ts', label: 'ChatApi.ts' },
    { path: 'examples/playground/src/examples/ai-chat/Index.ts', label: 'Index.ts' },
    { path: 'examples/playground/src/examples/ai-chat/Composer.ts', label: 'Composer.ts' },
    { path: 'examples/playground/src/examples/ai-chat/Clock.ts', label: 'Clock.ts' },
    { path: 'examples/playground/src/examples/ai-chat/AiChatExample.vue', label: 'AiChatExample.vue' }
  ]"
/>

## The parts and the tools

<LazyCodeGroup
  :files="[
    { path: 'examples/playground/src/examples/ai-chat/ChatMessage.ts', label: 'ChatMessage.ts' },
    { path: 'examples/playground/src/examples/ai-chat/parts/Parts.ts', label: 'parts/Parts.ts' },
    { path: 'examples/playground/src/examples/ai-chat/parts/ToolBatchPart.ts', label: 'ToolBatchPart.ts' },
    { path: 'examples/playground/src/examples/ai-chat/tools/Tools.ts', label: 'tools/Tools.ts' },
    { path: 'examples/playground/src/examples/ai-chat/tools/ToolCallModel.ts', label: 'ToolCallModel.ts' },
    { path: 'examples/playground/src/examples/ai-chat/tools/BashCall.ts', label: 'BashCall.ts' },
    { path: 'examples/playground/src/examples/ai-chat/tools/EditCall.ts', label: 'EditCall.ts' },
    { path: 'examples/playground/src/examples/ai-chat/tools/ReadCall.ts', label: 'ReadCall.ts' },
    { path: 'examples/playground/src/examples/ai-chat/tools/AgentCall.ts', label: 'AgentCall.ts' },
    { path: 'examples/playground/src/examples/ai-chat/tools/CodeBlock.ts', label: 'CodeBlock.ts' },
    { path: 'examples/playground/src/examples/ai-chat/Highlighter.ts', label: 'Highlighter.ts' },
    { path: 'examples/playground/src/examples/ai-chat/Markdown.ts', label: 'Markdown.ts' },
    { path: 'examples/playground/src/examples/ai-chat/Scrub.ts', label: 'Scrub.ts' }
  ]"
/>

## The sample

The sample is built from a real session file by
`docs_v2/scripts/chat-sample.ts`: the conversation records are kept, the
session's bookkeeping (about a third of the records and most of the
bytes) is dropped, emails, key-shaped strings, secret assignments, PEM
blocks and home paths are scrubbed, tool outputs are cut in the middle
with a marker that says how much was removed, and images are kept within
a budget. The build refuses to write a page in which a forbidden pattern
survives. The same scrub runs in the browser over a session you open
yourself, before a character renders.

---
title: 'Example: AI Chat on the Virtual Scroller'
description: 'A real 10,000-message Claude Code session as a chat: history fetched a page at a time, tool calls that expand to their code, streaming replies, and a filterable index that selects and exports — every piece an ivue class over the virtual scroller.'
aside: false
pageClass: benchmarks-wide examples-page
relatedPosts: [subpixel-perfect-scrolling, one-question-deleted-537-lines, a-million-rows-twelve-divs, select-text-across-a-million-rows]
---

<script setup>
import LazyCodeGroup from '../.vitepress/theme/components/LazyCodeGroup.vue'
import ExampleAiChat from '../.vitepress/theme/components/examples/ExampleAiChat.vue'
</script>

# AI chat: a real 10,000-message session

A real Claude Code session: 10,350 messages. Only the few rows you can
see are in the page, and a message's text loads when you scroll to it.
The strip above the chat counts both as you go.

Every part is an ivue class, on the same scroller as the
[million-row example](/examples/virtual-scroller).

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
    { path: 'examples/playground/src/examples/ai-chat/Chat.vue', label: 'Chat.vue' }
  ]"
/>

## The parts and the tool calls

<LazyCodeGroup
  :files="[
    { path: 'examples/playground/src/examples/ai-chat/message/ChatMessage.ts', label: 'message/ChatMessage.ts' },
    { path: 'examples/playground/src/examples/ai-chat/message/message-part/MessagePartList.ts', label: 'message-part/MessagePartList.ts' },
    { path: 'examples/playground/src/examples/ai-chat/message/message-part/MessagePart.ToolCall.ts', label: 'MessagePart.ToolCall.ts' },
    { path: 'examples/playground/src/examples/ai-chat/message/message-part/MessagePart.ToolBatch.ts', label: 'MessagePart.ToolBatch.ts' },
    { path: 'examples/playground/src/examples/ai-chat/message/message-part/tool-call/ToolCall.ts', label: 'tool-call/ToolCall.ts' },
    { path: 'examples/playground/src/examples/ai-chat/message/message-part/tool-call/ToolCall.Bash.ts', label: 'ToolCall.Bash.ts' },
    { path: 'examples/playground/src/examples/ai-chat/message/message-part/tool-call/ToolCall.Edit.ts', label: 'ToolCall.Edit.ts' },
    { path: 'examples/playground/src/examples/ai-chat/message/message-part/tool-call/ToolCall.Read.ts', label: 'ToolCall.Read.ts' },
    { path: 'examples/playground/src/examples/ai-chat/message/message-part/tool-call/ToolCall.Agent.ts', label: 'ToolCall.Agent.ts' },
    { path: 'examples/playground/src/examples/ai-chat/message/message-part/tool-call/ToolCall.CodeBlock.ts', label: 'ToolCall.CodeBlock.ts' },
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

/*
=== GENERATOR ===
Goal: Prove each tool card reads its own shape out of a call: a shell call shows command, stdout and stderr with ANSI stripped and its exit state; an edit is a unified diff from the recorded hunks or from the strings; a read is the numbered listing with its numbers turned into a counter that starts where the read started; a write is the file; every card's collapsed line is the projection's text; the registry maps every name and falls back.
[Full granularity in two clicks](../ai-chat.invariants.md#full-granularity-in-two-clicks)
// domain-invariant: $ToolCallModel — If a call is expanded, then the card shows the full input and the full result, capped only by a cap the reader can lift
// domain-invariant: $CodeBlock — If the copy button is pressed, then the whole code as given reaches the clipboard, not the capped view, and the button says so for a moment
Impossible if true: an expanded card holds back part of its result behind anything but the cap the reader can lift

=== GENERATOR-DESCRIBED ===
$ToolCallModel and its tool classes read each call's own shape: shell, edit, read, write, agent, MCP, and the generic fallback.
*/
import { describe, expect, it, vi } from 'vitest';
import { Chat } from '../Chat';
import type { SessionLog } from '../SessionLog';
import { ToolCallModel } from './ToolCallModel';
import { BashCall } from './BashCall';
import { EditCall } from './EditCall';
import { ReadCall } from './ReadCall';
import { WriteCall } from './WriteCall';
import { CodeBlock } from './CodeBlock';
import { AgentCall } from './AgentCall';
import { McpCall } from './McpCall';
import { hosted } from '../../virtual-scroller/hosted';

function makeCall(name: string, input: Record<string, unknown>, result: Partial<SessionLog.ToolResult> | null = { text: '', images: [], isError: false, structured: null }, extra: Partial<SessionLog.ToolCall> = {}): SessionLog.ToolCall {
  return { id: `${name}-1`, name, input, state: result ? (result.isError ? 'failed' : 'done') : 'pending', result: result ? { text: '', images: [], isError: false, structured: null, ...result } : null, durationMs: result ? 1500 : null, startedAt: 0, children: null, ...extra };
}

function chatHost() {
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
  return hosted(() => new Chat.Class());
}

describe('tool cards', () => {
  // domain-invariant: $ToolCallModel — If a call is expanded, then the card shows the full input and the full result, capped only by a cap the reader can lift
  // invariant: Full granularity in two clicks (examples/playground/src/examples/ai-chat/ai-chat.invariants.md)
  // impossible-if-true: $ToolCallModel — an expanded card holds back part of its result behind anything but the cap the reader can lift
  it('the base card: head text, state, expansion on the chat, the cap and its lift', () => {
    const { instance: chat, unmount } = chatHost();
    const call = makeCall('Mystery', { thing: 'first line\nsecond' }, { text: 'x'.repeat(5000) });
    const model = new ToolCallModel.Class({ call, chat, message: null });
    expect(model.headText).toBe('Mystery first line');
    expect(model.icon).toBe('⚙');
    expect(model.stateLabel).toBe('done');
    expect(model.elapsedLabel).toBe('1.5s');
    expect(model.isExpanded).toBe(false);
    model.toggle();
    expect(model.isExpanded).toBe(true);
    expect(model.cardClass).toEqual({ 'ac-tool-open': true, 'ac-tool-running': false, 'ac-tool-failed': false });
    expect(model.sections.map((section) => section.title)).toEqual(['input', 'result']);
    expect(model.isCapped).toBe(true);
    expect(model.cap).toBe(ToolCallModel.Class.CAP);
    model.toggleAll();
    expect(model.showsAll).toBe(true);
    expect(model.cap).toBeNull();
    expect(model.showAllLabel).toBe('Show less');
    const pending = new ToolCallModel.Class({ call: makeCall('Bash', { command: 'ls' }, null, { startedAt: Date.now() - 3000, state: 'running' }), chat, message: null });
    expect(pending.isRunning).toBe(true);
    expect(pending.stateLabel).toBe('running');
    expect(pending.elapsedLabel).toMatch(/^\ds$/);
    unmount();
  });

  it('a shell call: command, stdout and stderr with ANSI stripped, the exit state', () => {
    const { instance: chat, unmount } = chatHost();
    const call = makeCall('Bash', { command: 'npm test\necho done', description: 'Run the tests', run_in_background: true }, { text: 'unused', structured: { stdout: '\u001b[32mok\u001b[0m 3 passed', stderr: 'warn', interrupted: false } });
    const model = new BashCall.Class({ call, chat, message: null });
    expect(model.command).toBe('npm test\necho done');
    expect(model.commandText).toBe('npm test\necho done'); // written across lines: shown as written
    // a one-line chain breaks at each step; separators inside quotes stay
    expect(BashCall.$Class.breakLines('cd ~/dev; grep \'"a; b"\' x.json | head -3 && echo "ok || no" || exit 1')).toBe(
      'cd ~/dev;\ngrep \'"a; b"\' x.json\n  | head -3\n  && echo "ok || no"\n  || exit 1',
    );
    expect(model.stdout).toBe('ok 3 passed');
    expect(model.stderr).toBe('warn');
    expect(model.ranInBackground).toBe(true);
    expect(model.exitLabel).toBe('exit 0');
    expect(model.sections.map((section) => section.title)).toEqual(['command', 'stdout', 'stderr']);
    const silent = new BashCall.Class({ call: makeCall('Bash', { command: 'true' }, { structured: { stdout: '', stderr: '', interrupted: true } }), chat, message: null });
    expect(silent.hasNoOutput).toBe(true);
    expect(silent.exitLabel).toBe('interrupted');
    const failed = new BashCall.Class({ call: makeCall('Bash', { command: 'false' }, { text: 'boom', isError: true }), chat, message: null });
    expect(failed.exitLabel).toBe('failed');
    expect(failed.stdout).toBe('boom');
    unmount();
  });

  it('an edit: a unified diff from hunks, or from the strings, with a change count', () => {
    const { instance: chat, unmount } = chatHost();
    const hunks = [{ oldStart: 1, oldLines: 2, newStart: 1, newLines: 2, lines: [' a', '-b', '+c'] }];
    const model = new EditCall.Class({ call: makeCall('Edit', { file_path: '~/dev/app.ts', old_string: 'b', new_string: 'c', replace_all: true }, { structured: { structuredPatch: hunks } }), chat, message: null });
    expect(model.filePath).toBe('dev/app.ts');
    expect(model.language).toBe('typescript');
    expect(model.diff).toBe('@@ -1,2 +1,2 @@\n a\n-b\n+c');
    expect(model.changeLabel).toBe('+1 −1');
    expect(model.replacesAll).toBe(true);
    const plain = new EditCall.Class({ call: makeCall('Edit', { file_path: 'x.py', old_string: 'one\ntwo', new_string: 'three' }), chat, message: null });
    expect(plain.diff).toBe('-one\n-two\n+three');
    expect(plain.sections[0]).toMatchObject({ title: 'x.py', lang: 'diff' });
    unmount();
  });

  it('a read: numbers come off the listing and the counter starts where the read started', () => {
    const { instance: chat, unmount } = chatHost();
    const model = new ReadCall.Class({ call: makeCall('Read', { file_path: 'lib/Reactive.ts', offset: 400, limit: 2 }, { text: '   400\tconst a = 1;\n   401\tconst b = 2;', structured: { file: { numLines: 2, totalLines: 900 } } }), chat, message: null });
    expect(model.startLine).toBe(400);
    expect(model.code).toBe('const a = 1;\nconst b = 2;');
    expect(model.rangeLabel).toBe('from line 400, 2 lines');
    expect(model.lineCountLabel).toBe('2 of 900 lines');
    expect(model.sections[0]).toMatchObject({ lang: 'typescript', startLine: 400 });
    const image = new ReadCall.Class({ call: makeCall('Read', { file_path: 'shot.png' }, { images: ['data:image/png;base64,AAAA'] }), chat, message: null });
    expect(image.isImage).toBe(true);
    expect(image.sections).toEqual([]);
    expect(image.rangeLabel).toBe('whole file');
    unmount();
  });

  it('a write is the file with a line count; an agent folds its thread; an MCP call splits its name', () => {
    const { instance: chat, unmount } = chatHost();
    const write = new WriteCall.Class({ call: makeCall('Write', { file_path: 'a.vue', content: '<template>\n</template>' }, { structured: { structuredPatch: [{}] } }), chat, message: null });
    expect(write.lineCountLabel).toBe('2 lines');
    expect(write.wasOverwrite).toBe(true);
    expect(write.sections[0]).toMatchObject({ lang: 'vue', startLine: 1 });
    const thread: SessionLog.Message[] = [{ id: 's1', index: 0, role: 'user', timestamp: 0, parts: [{ kind: 'text', text: 'go' }], sidechain: true }];
    const agent = new AgentCall.Class({ call: makeCall('Agent', { description: 'survey', prompt: 'look', subagent_type: 'Explore' }, { text: 'Findings.', structured: { resolvedModel: 'sonnet' } }, { children: thread }), chat, message: null });
    expect(agent.hasThread).toBe(true);
    expect(agent.threadLabel).toBe("show the subagent's thread · 1 message");
    agent.toggleThread();
    expect(agent.isThreadOpen).toBe(true);
    expect(agent.sections.map((section) => section.title)).toEqual(['prompt', 'report']);
    expect(agent.modelLabel).toBe('sonnet');
    const mcp = new McpCall.Class({ call: makeCall('mcp__playwright__browser_run_code_unsafe', { code: 'await page.goto("x")' }, { text: '{"ok":true}' }), chat, message: null });
    expect(mcp.server).toBe('playwright');
    expect(mcp.tool).toBe('browser_run_code_unsafe');
    expect(mcp.resultPretty).toBe('{\n  "ok": true\n}');
    expect(mcp.sections.map((section) => section.lang)).toEqual(['javascript', 'json']);
    expect(mcp.icon).toBe('⌘');
    unmount();
  });
});

// domain-invariant: $CodeBlock — If the copy button is pressed, then the whole code as given reaches the clipboard, not the capped view, and the button says so for a moment
it('a code block copies its whole code and says so for a moment', async () => {
  vi.useFakeTimers();
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(globalThis.navigator, 'clipboard', { value: { writeText }, configurable: true });
  const block = hosted(() => new CodeBlock.Class({ code: 'one\ntwo\nthree', cap: 1 }));
  expect(block.instance.isCapped).toBe(true);
  await block.instance.copy();
  expect(writeText).toHaveBeenCalledWith('one\ntwo\nthree');
  expect(block.instance.copied.value).toBe(true);
  expect(block.instance.copyLabel).toBe('Copied');
  vi.advanceTimersByTime(CodeBlock.$Class.COPIED_MS);
  expect(block.instance.copied.value).toBe(false);
  expect(block.instance.copyLabel).toBe('Copy');
  // no async clipboard — a plain-http page on a LAN address — the legacy command copies instead
  Object.defineProperty(globalThis.navigator, 'clipboard', { value: undefined, configurable: true });
  const legacy = vi.fn().mockReturnValue(true);
  Object.defineProperty(document, 'execCommand', { value: legacy, configurable: true });
  await block.instance.copy();
  expect(legacy).toHaveBeenCalledWith('copy');
  expect(block.instance.copyLabel).toBe('Copied');
  block.unmount();
  vi.useRealTimers();
});

/*
=== GENERATOR ===
Goal: Prove the parser turns a Claude Code session file into the messages a chat renders: split assistant turns merge, every tool result joins its call with the structured payload, runs of tool calls contract to batches and single calls never do, subagent transcripts fold under the Agent call that spawned them, the harness's own tags leave a prompt, and bookkeeping records leave nothing.
[A tool result joins its call](./ai-chat.invariants.md#a-tool-result-joins-its-call)
[A batch is two or more](./ai-chat.invariants.md#a-batch-is-two-or-more)
// domain-invariant: $SessionLog — If an assistant turn arrives as several records sharing one message id, then it is one message with its blocks in order
// domain-invariant: $SessionLog — If a tool result names a tool use id, then that call carries the result, its structured payload and its duration
// domain-invariant: $SessionLog — If two or more tool calls follow each other with no text between, then they render as one batch; a single call is never wrapped
Impossible if true: a record whose type is not user, assistant or system produces a message
Impossible if true: a batch holds one call

=== GENERATOR-DESCRIBED ===
$SessionLog turns a Claude Code session file into messages: merged turns, joined tool results, batches, folded subagents.
*/
import { describe, expect, it } from 'vitest';
import { SessionLog } from './SessionLog';
import { SessionParser } from './SessionParser';

const T0 = '2026-09-09T10:00:00.000Z';
const at = (seconds: number) => new Date(Date.parse(T0) + seconds * 1000).toISOString();

const line = (record: object) => JSON.stringify(record);
const assistant = (
  uuid: string,
  apiId: string,
  block: object,
  seconds: number,
  extra: object = {}
) =>
  line({
    type: 'assistant',
    uuid,
    parentUuid: null,
    timestamp: at(seconds),
    message: { id: apiId, model: 'claude-opus-5', content: [block], usage: { output_tokens: 7 } },
    ...extra
  });
const toolResult = (
  uuid: string,
  toolUseId: string,
  content: unknown,
  seconds: number,
  structured: unknown = null,
  extra: object = {}
) =>
  line({
    type: 'user',
    uuid,
    timestamp: at(seconds),
    message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUseId, content }] },
    toolUseResult: structured,
    ...extra
  });
const prompt = (uuid: string, text: string, seconds: number, extra: object = {}) =>
  line({
    type: 'user',
    uuid,
    timestamp: at(seconds),
    message: { role: 'user', content: text },
    ...extra
  });

const SESSION = [
  line({ type: 'mode', mode: 'default', sessionId: 's' }),
  line({ type: 'file-history-snapshot', messageId: 'x', snapshot: { big: 'x'.repeat(50) } }),
  prompt('u1', '<system-reminder>ignore me</system-reminder>Make it faster', 0),
  assistant('a1', 'api-1', { type: 'thinking', thinking: 'plan', signature: 's' }, 1),
  assistant('a2', 'api-1', { type: 'text', text: 'On it.' }, 1),
  assistant(
    'a3',
    'api-1',
    { type: 'tool_use', id: 'call-1', name: 'Bash', input: { command: 'npm test\necho done' } },
    1
  ),
  toolResult('r1', 'call-1', 'ok', 4, { stdout: 'ok', stderr: '', interrupted: false }),
  assistant(
    'a4',
    'api-2',
    {
      type: 'tool_use',
      id: 'call-2',
      name: 'Read',
      input: { file_path: '/home/parallels/dev/app.ts' }
    },
    5
  ),
  toolResult('r2', 'call-2', '1\tconst a = 1;', 6, {
    type: 'text',
    file: { filePath: '/home/parallels/dev/app.ts', content: 'const a = 1;', numLines: 1 }
  }),
  assistant(
    'a5',
    'api-3',
    {
      type: 'tool_use',
      id: 'call-3',
      name: 'Edit',
      input: { file_path: '/home/parallels/dev/app.ts', old_string: 'a', new_string: 'b' }
    },
    7
  ),
  toolResult('r3', 'call-3', 'edited', 8, {
    filePath: '/home/parallels/dev/app.ts',
    structuredPatch: []
  }),
  line({
    type: 'system',
    uuid: 'sys1',
    subtype: 'turn_duration',
    durationMs: 8000,
    timestamp: at(8)
  }),
  prompt('u2', 'now the agent', 9),
  assistant(
    'a6',
    'api-4',
    {
      type: 'tool_use',
      id: 'call-4',
      name: 'Agent',
      input: { description: 'survey', prompt: 'look around' }
    },
    10
  ),
  prompt('s1', 'look around', 10, { isSidechain: true, parentUuid: null }),
  assistant('s2', 'api-s1', { type: 'text', text: 'found it' }, 11, {
    isSidechain: true,
    parentUuid: 's1'
  }),
  toolResult('r4', 'call-4', [{ type: 'text', text: 'Findings.' }], 12, {
    agentId: 'agent-1',
    status: 'done'
  }),
  assistant('a7', 'api-5', { type: 'text', text: 'Done, mailed ekalashnikov@gmail.com' }, 13),
  line({
    type: 'user',
    uuid: 'c1',
    timestamp: at(14),
    isCompactSummary: true,
    message: { role: 'user', content: 'Summary of everything' }
  }),
  prompt('m1', 'meta text', 15, { isMeta: true }),
  assistant(
    'a8',
    'api-6',
    { type: 'tool_use', id: 'call-5', name: 'Write', input: { file_path: 'x', content: 'y' } },
    16
  ),
  toolResult('r5', 'call-5', 'written', 17, { filePath: 'x' }),
  'not json at all',
  ''
].join('\n');

describe('SessionLog', () => {
  // domain-invariant: $SessionLog — If an assistant turn arrives as several records sharing one message id, then it is one message with its blocks in order
  // domain-invariant: $SessionLog — If a tool result names a tool use id, then that call carries the result, its structured payload and its duration
  // domain-invariant: $SessionLog — If two or more tool calls follow each other with no text between, then they render as one batch; a single call is never wrapped
  // invariant: A tool result joins its call (examples/playground/src/examples/ai-chat/ai-chat.invariants.md)
  it('merges split turns, joins results, contracts runs to batches and keeps a single call bare', () => {
    const messages = SessionLog.Class.parse(SESSION);
    expect(messages.map((message) => message.role)).toEqual([
      'user',
      'assistant',
      'assistant',
      'system',
      'user',
      'assistant',
      'assistant',
      'system',
      'assistant'
    ]);
    expect(messages.map((message) => message.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);

    const [first, turn, batch, duration, second, agent, done, compaction, single] = messages;
    expect(first.parts).toEqual([{ kind: 'text', text: 'Make it faster' }]);

    // three records, one message: thinking, text, then the call
    expect(turn.apiId).toBe('api-1');
    expect(turn.parts.map((part) => part.kind)).toEqual(['thinking', 'text', 'tool_call']);
    const bash = turn.parts[2];
    if (bash.kind !== 'tool_call') throw new Error('expected a call');
    expect(bash.call.name).toBe('Bash');
    expect(bash.call.state).toBe('done');
    expect(bash.call.result?.text).toBe('ok');
    expect(bash.call.result?.structured).toEqual({ stdout: 'ok', stderr: '', interrupted: false });
    expect(bash.call.durationMs).toBe(3000);
    expect(SessionLog.Class.callSummary(bash.call)).toBe('npm test');

    // two tool-only turns in a row contract to one batch of two
    expect(batch.parts).toHaveLength(1);
    const run = batch.parts[0];
    if (run.kind !== 'tool_batch') throw new Error('expected a batch');
    expect(run.calls.map((call) => call.name)).toEqual(['Read', 'Edit']);
    expect(run.messageIds).toEqual(['a4', 'a5']);
    expect(batch.id).toBe('batch-a4');

    expect(duration.parts[0]).toMatchObject({
      kind: 'system',
      subtype: 'turn_duration',
      text: 'Turn took 8.0s',
      durationMs: 8000
    });
    expect(second.parts[0]).toEqual({ kind: 'text', text: 'now the agent' });

    // the Agent call is a single call (never wrapped) and carries the folded sidechain
    const agentPart = agent.parts[0];
    if (agentPart.kind !== 'tool_call') throw new Error('expected the agent call');
    expect(agentPart.call.result?.text).toBe('Findings.');
    expect(agentPart.call.children?.map((message) => message.role)).toEqual(['user', 'assistant']);
    expect(agentPart.call.children?.[1].parts).toEqual([{ kind: 'text', text: 'found it' }]);

    expect(done.parts).toEqual([{ kind: 'text', text: 'Done, mailed ekalashnikov@gmail.com' }]);
    expect(compaction.parts[0]).toMatchObject({
      kind: 'system',
      subtype: 'compaction',
      text: 'Context compacted',
      detail: 'Summary of everything'
    });
    expect(single.parts[0].kind).toBe('tool_call');
    expect(SessionLog.Class.messageText(batch)).toBe('2 tool calls: Read, Edit');
    expect(SessionLog.Class.messageText(turn)).toBe(
      'thinking · 4 chars\nOn it.\ntool: Bash npm test'
    );
  });

  // impossible-if-true: $SessionLog — a record whose type is not user, assistant or system produces a message
  // impossible-if-true: $SessionLog — a batch holds one call
  it('drops bookkeeping, meta prompts and bad lines, and scrubs when asked', () => {
    const messages = SessionLog.Class.parse(SESSION, { scrub: true });
    expect(messages).toHaveLength(9);
    expect(JSON.stringify(messages)).not.toContain('gmail');
    expect(JSON.stringify(messages)).not.toContain('/home/parallels');
    expect(JSON.stringify(messages)).not.toContain('meta text');
    for (const message of messages)
      for (const part of message.parts)
        if (part.kind === 'tool_batch') expect(part.calls.length).toBeGreaterThanOrEqual(2);
    const parser = new SessionParser.Class({ scrub: true, systemSubtypes: ['compaction'] });
    for (const entry of SESSION.split('\n')) parser.line(entry);
    expect(
      parser
        .finish()
        .filter((message) => message.role === 'system')
        .map((message) => message.parts[0])
    ).toMatchObject([{ subtype: 'compaction' }]);
    expect(parser.scrubCounts.email).toBe(1);
    expect(parser.lines).toBe(SESSION.split('\n').length);
  });

  // invariant: A batch is two or more (examples/playground/src/examples/ai-chat/ai-chat.invariants.md)
  it('contracts consecutive calls inside one mixed turn and leaves a lone call alone', () => {
    const mixed = [
      assistant('b1', 'api-9', { type: 'text', text: 'Two things:' }, 0),
      assistant(
        'b2',
        'api-9',
        { type: 'tool_use', id: 'c1', name: 'Grep', input: { pattern: 'foo' } },
        0
      ),
      assistant(
        'b3',
        'api-9',
        { type: 'tool_use', id: 'c2', name: 'Glob', input: { pattern: '*.ts' } },
        0
      ),
      assistant('b4', 'api-9', { type: 'text', text: 'and one more' }, 0),
      assistant(
        'b5',
        'api-9',
        { type: 'tool_use', id: 'c3', name: 'WebFetch', input: { url: 'https://ivue.dev' } },
        0
      )
    ].join('\n');
    const [message] = SessionLog.Class.parse(mixed);
    expect(message.parts.map((part) => part.kind)).toEqual([
      'text',
      'tool_batch',
      'text',
      'tool_call'
    ]);
    const pending = message.parts[3];
    if (pending.kind !== 'tool_call') throw new Error('expected a call');
    expect(pending.call.state).toBe('pending');
    expect(pending.call.result).toBeNull();
    expect(SessionLog.Class.callSummary(pending.call)).toBe('https://ivue.dev');
  });

  it('formats durations, epochs, result text and images', () => {
    expect(SessionLog.Class.duration(240)).toBe('240ms');
    expect(SessionLog.Class.duration(4800)).toBe('4.8s');
    expect(SessionLog.Class.duration(47_000)).toBe('47s');
    expect(SessionLog.Class.duration(64_000)).toBe('1m 04s');
    expect(SessionLog.Class.duration(3_720_000)).toBe('1h 02m');
    expect(SessionLog.Class.epoch({ type: 'user' })).toBe(0);
    expect(SessionLog.Class.epoch({ type: 'user', timestamp: 'nope' })).toBe(0);
    expect(SessionLog.Class.resultText(undefined)).toBe('');
    expect(
      SessionLog.Class.resultText([
        { type: 'text', text: 'a' },
        { type: 'image', source: { media_type: 'image/png', data: 'AAAA' } }
      ])
    ).toBe('a\n[image]');
    expect(
      SessionLog.Class.resultImages([
        { type: 'image', source: { media_type: 'image/png', data: 'AAAA' } }
      ])
    ).toEqual(['data:image/png;base64,AAAA']);
    expect(SessionLog.Class.resultImages('plain')).toEqual([]);
    expect(
      SessionLog.Class.callSummary({
        id: 'x',
        name: 'Mystery',
        input: { anything: 'first\nsecond' },
        state: 'pending',
        result: null,
        durationMs: null,
        startedAt: 0,
        children: null
      })
    ).toBe('first');
    expect(
      SessionLog.Class.callSummary({
        id: 'x',
        name: 'Mystery',
        input: { count: 2 },
        state: 'pending',
        result: null,
        durationMs: null,
        startedAt: 0,
        children: null
      })
    ).toBe('');
    expect(
      SessionLog.Class.partText({
        kind: 'attachment',
        name: 'a.png',
        size: 1,
        mimeType: 'image/png',
        url: 'blob:x'
      })
    ).toBe('a.png');
  });

  it('a sidechain with no Agent call becomes a subagent note at the end', () => {
    const orphan = [
      prompt('u1', 'hi', 0),
      prompt('s1', 'side', 1, { isSidechain: true, parentUuid: null }),
      assistant('s2', 'api-s', { type: 'text', text: 'side answer' }, 2, {
        isSidechain: true,
        parentUuid: 's1'
      })
    ].join('\n');
    const messages = SessionLog.Class.parse(orphan);
    expect(messages).toHaveLength(2);
    expect(messages[1].parts[0]).toMatchObject({
      kind: 'system',
      subtype: 'subagent',
      text: 'Subagent thread (2 messages)'
    });
    expect(messages[1].children?.map((message) => message.role)).toEqual(['user', 'assistant']);
  });
});

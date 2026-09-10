import { Scrub } from './Scrub';
import { SessionLog } from './SessionLog';

// The streaming half of SessionLog: fed one line at a time, it keeps the
// open assistant turn, the calls awaiting their results, the sidechain
// threads, and the scrub counts, and hands back the shaped messages on
// finish(). SessionLog holds the pure functions this one calls.
class $SessionParser {
  constructor(protected options: SessionLog.Options) {}

  protected messages: SessionLog.Message[] = [];
  protected sidechains: SessionLog.Message[][] = [];
  protected currentSidechain: SessionLog.Message[] | null = null;
  protected open: SessionLog.Message | null = null;
  protected openApiId: string | null = null;
  protected openIsSidechain = false;
  protected calls = new Map<string, { call: SessionLog.ToolCall; startedAt: number }>();
  protected lineCount = 0;
  protected counts: Scrub.Counts = {};

  get scrubCounts(): Scrub.Counts {
    return this.counts;
  }

  get lines(): number {
    return this.lineCount;
  }

  /** one line of the file; blank and unparsable lines are skipped */
  line(text: string) {
    this.lineCount++;
    const trimmed = text.trim();
    if (!trimmed) return;
    let record: SessionLog.Record;
    try {
      record = JSON.parse(trimmed) as SessionLog.Record;
    } catch {
      return;
    }
    this.record(record);
  }

  record(record: SessionLog.Record) {
    if (!SessionLog.Class.CONVERSATION_TYPES.has(record.type)) return;
    if (this.options.scrub) record = Scrub.Class.value(record, this.counts);
    if (record.type === 'assistant') this.assistant(record);
    else if (record.type === 'user') this.user(record);
    else this.system(record);
  }

  /** close the open turn, contract batches, fold sidechains; the messages in order */
  finish(): SessionLog.Message[] {
    this.closeOpen();
    const folded = this.foldSidechains(this.messages);
    const batched = this.batch(folded);
    batched.forEach((message, index) => (message.index = index));
    return batched;
  }

  /* ---- records ---- */

  protected target(record: SessionLog.Record): SessionLog.Message[] {
    if (!record.isSidechain) {
      this.currentSidechain = null;
      return this.messages;
    }
    // a sidechain starts at a record whose parent is not itself a sidechain record
    if (!this.currentSidechain || record.parentUuid === null || record.parentUuid === undefined) {
      this.currentSidechain = [];
      this.sidechains.push(this.currentSidechain);
    }
    return this.currentSidechain;
  }

  protected assistant(record: SessionLog.Record) {
    const message = record.message;
    if (!message || !Array.isArray(message.content)) return;
    const apiId = message.id ?? record.uuid ?? '';
    const isSidechain = Boolean(record.isSidechain);
    if (!this.open || this.openApiId !== apiId || this.openIsSidechain !== isSidechain) {
      this.closeOpen();
      this.open = {
        id: record.uuid ?? `${apiId}-${this.lineCount}`,
        index: -1,
        role: 'assistant',
        timestamp: SessionLog.Class.epoch(record),
        parts: [],
        model: message.model,
        usage: message.usage,
        apiId,
        sidechain: isSidechain,
      };
      this.openApiId = apiId;
      this.openIsSidechain = isSidechain;
      this.target(record).push(this.open);
    } else if (message.usage) this.open.usage = message.usage;
    for (const block of message.content) {
      if (block.type === 'text' && block.text?.trim()) this.open.parts.push({ kind: 'text', text: block.text });
      else if (block.type === 'thinking' && block.thinking?.trim())
        this.open.parts.push({ kind: 'thinking', text: block.thinking, durationMs: null });
      else if (block.type === 'tool_use' && block.id) {
        const call: SessionLog.ToolCall = {
          id: block.id,
          name: block.name ?? 'tool',
          input: (block.input ?? {}) as Record<string, unknown>,
          state: 'pending',
          result: null,
          durationMs: null,
          startedAt: this.open.timestamp,
          children: null,
        };
        this.calls.set(block.id, { call, startedAt: this.open.timestamp });
        this.open.parts.push({ kind: 'tool_call', call });
      }
    }
  }

  protected user(record: SessionLog.Record) {
    const message = record.message;
    if (!message) return;
    if (record.isCompactSummary) {
      this.closeOpen();
      const text = typeof message.content === 'string' ? message.content : SessionLog.Class.resultText(message.content as SessionLog.ResultContent);
      this.target(record).push({
        id: record.uuid ?? `compact-${this.lineCount}`,
        index: -1,
        role: 'system',
        timestamp: SessionLog.Class.epoch(record),
        parts: [{ kind: 'system', subtype: 'compaction', text: SessionLog.Class.COMPACTION_TEXT, detail: text, durationMs: null }],
        sidechain: Boolean(record.isSidechain),
      });
      return;
    }
    if (typeof message.content === 'string') {
      if (record.isMeta) return;
      const text = SessionLog.Class.promptText(message.content);
      if (!text) return;
      this.closeOpen();
      this.target(record).push({
        id: record.uuid ?? `user-${this.lineCount}`,
        index: -1,
        role: 'user',
        timestamp: SessionLog.Class.epoch(record),
        parts: [{ kind: 'text', text }],
        sidechain: Boolean(record.isSidechain),
      });
      return;
    }
    if (!Array.isArray(message.content)) return;
    const receivedAt = SessionLog.Class.epoch(record);
    const typed: string[] = [];
    for (const block of message.content) {
      if (block.type === 'tool_result' && block.tool_use_id) {
        const entry = this.calls.get(block.tool_use_id);
        if (!entry) continue;
        const { call, startedAt } = entry;
        call.result = {
          text: SessionLog.Class.resultText(block.content),
          images: SessionLog.Class.resultImages(block.content),
          isError: Boolean(block.is_error),
          structured: record.toolUseResult ?? null,
        };
        call.state = block.is_error ? 'failed' : 'done';
        call.durationMs = receivedAt && startedAt ? Math.max(0, receivedAt - startedAt) : null;
        this.calls.delete(block.tool_use_id);
      } else if (block.type === 'text' && block.text) {
        const text = SessionLog.Class.promptText(block.text);
        if (text) typed.push(text);
      }
    }
    if (typed.length && !record.isMeta) {
      this.closeOpen();
      this.target(record).push({
        id: record.uuid ?? `user-${this.lineCount}`,
        index: -1,
        role: 'user',
        timestamp: receivedAt,
        parts: [{ kind: 'text', text: typed.join('\n\n') }],
        sidechain: Boolean(record.isSidechain),
      });
    }
  }

  protected system(record: SessionLog.Record) {
    const subtype = record.subtype ?? 'system';
    if (this.options.systemSubtypes && !this.options.systemSubtypes.includes(subtype)) return;
    this.closeOpen();
    const text =
      subtype === 'turn_duration'
        ? `Turn took ${SessionLog.Class.duration(record.durationMs ?? 0)}`
        : subtype === 'stop_hook_summary'
          ? `Hooks ran${record.hookCount ? ` (${record.hookCount})` : ''}`
          : typeof record.content === 'string'
            ? record.content.split('\n')[0]
            : subtype;
    this.target(record).push({
      id: record.uuid ?? `system-${this.lineCount}`,
      index: -1,
      role: 'system',
      timestamp: SessionLog.Class.epoch(record),
      parts: [
        {
          kind: 'system',
          subtype,
          text,
          detail: typeof record.content === 'string' ? record.content : '',
          durationMs: record.durationMs ?? null,
        },
      ],
      sidechain: Boolean(record.isSidechain),
    });
  }

  protected closeOpen() {
    if (!this.open) return;
    if (this.open.parts.length === 0) {
      const list = this.open.sidechain ? this.currentSidechain : this.messages;
      const at = list?.lastIndexOf(this.open) ?? -1;
      if (list && at >= 0) list.splice(at, 1);
    }
    this.open = null;
    this.openApiId = null;
  }

  /* ---- shaping ---- */

  /** every sidechain thread under the Agent call it followed, in order; leftovers become system notes */
  protected foldSidechains(messages: SessionLog.Message[]): SessionLog.Message[] {
    const threads = this.sidechains.filter((thread) => thread.length);
    if (!threads.length) return messages;
    let next = 0;
    for (const message of messages) {
      for (const part of message.parts) {
        if (part.kind === 'tool_call' && part.call.name === 'Agent' && next < threads.length) {
          const thread = threads[next++];
          thread.forEach((entry, index) => (entry.index = index));
          part.call.children = this.batch(thread);
        }
      }
    }
    const leftover = threads.slice(next);
    for (const thread of leftover)
      messages.push({
        id: `sidechain-${thread[0].id}`,
        index: -1,
        role: 'system',
        timestamp: thread[0].timestamp,
        parts: [{ kind: 'system', subtype: 'subagent', text: `Subagent thread (${thread.length} messages)`, detail: '', durationMs: null }],
        sidechain: false,
        children: this.batch(thread),
      });
    return messages;
  }

  /**
   * Runs of tool calls contract to one batch message: inside a turn,
   * consecutive tool-call parts; across turns, consecutive tool-only
   * assistant messages. Two or more calls make a batch; one never does.
   */
  protected batch(messages: SessionLog.Message[]): SessionLog.Message[] {
    const output: SessionLog.Message[] = [];
    let run: SessionLog.Message[] = [];
    const flush = () => {
      if (!run.length) return;
      const calls = run.flatMap((message) => message.parts.filter((part): part is SessionLog.ToolCallPart => part.kind === 'tool_call').map((part) => part.call));
      const thinking = run.flatMap((message) => message.parts.filter((part): part is SessionLog.ThinkingPart => part.kind === 'thinking'));
      if (calls.length >= 2) {
        const first = run[0];
        const last = run[run.length - 1];
        output.push({
          id: `batch-${first.id}`,
          index: -1,
          role: 'assistant',
          timestamp: first.timestamp,
          parts: [...thinking, { kind: 'tool_batch', calls, messageIds: run.map((message) => message.id) }],
          model: last.model,
          usage: last.usage,
          sidechain: first.sidechain,
        });
      } else output.push(...run);
      run = [];
    };
    for (const message of messages) {
      if (SessionLog.Class.isToolOnly(message)) {
        run.push(message);
        continue;
      }
      flush();
      output.push(this.batchWithin(message));
    }
    flush();
    return output;
  }

  /** inside a mixed turn (text, then several calls): the consecutive calls contract */
  protected batchWithin(message: SessionLog.Message): SessionLog.Message {
    if (message.role !== 'assistant') return message;
    const parts: SessionLog.Part[] = [];
    let calls: SessionLog.ToolCall[] = [];
    const flush = () => {
      if (calls.length >= 2) parts.push({ kind: 'tool_batch', calls, messageIds: [message.id] });
      else for (const call of calls) parts.push({ kind: 'tool_call', call });
      calls = [];
    };
    for (const part of message.parts) {
      if (part.kind === 'tool_call') calls.push(part.call);
      else {
        flush();
        parts.push(part);
      }
    }
    flush();
    message.parts = parts;
    return message;
  }
}

export namespace SessionParser {
  export const $Class = $SessionParser;
  export let Class = $Class;
  export type Model = InstanceType<typeof Class>;
}

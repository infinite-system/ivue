// Build the AI chat example's sample from a real Claude Code session:
//   npx vite-node docs_v2/scripts/chat-sample.ts -- <session.jsonl> [outDir]
//
// Parses the file as a stream through the example's own SessionLog (with
// the scrub rules on), folds the session's subagent transcripts under
// their Agent calls, shrinks what no reader needs whole (tool outputs are
// cut in the middle with a marker, images kept within a budget), writes
// numbered pages plus meta.json, and refuses to write anything a
// forbidden pattern survives in. Prints the scrub report.
import { createReadStream, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { basename, dirname, join, resolve } from 'node:path';
import { SessionLog } from '../../examples/playground/src/examples/ai-chat/SessionLog';
import { Scrub } from '../../examples/playground/src/examples/ai-chat/Scrub';
import { SessionParser } from '../../examples/playground/src/examples/ai-chat/SessionParser';

const PAGE_SIZE = 200;
const CAPS = {
  resultText: 8_000,
  structuredField: 8_000,
  inputField: 8_000,
  thinking: 6_000,
  text: 24_000,
  imageBytes: 160_000,
  imageBudget: 60,
};

const [input, outArgument] = process.argv.slice(2);
if (!input) {
  console.error('usage: vite-node docs_v2/scripts/chat-sample.ts -- <session.jsonl> [outDir]');
  process.exit(1);
}
const outDir = resolve(outArgument ?? 'docs_v2/public/examples/chat/sample');

async function parseFile(path: string): Promise<{ messages: SessionLog.Message[]; parser: SessionParser.Model }> {
  const parser = new SessionParser.Class({ scrub: true });
  for await (const line of createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity })) parser.line(line);
  return { messages: parser.finish(), parser };
}

/** every tool call in a message tree, depth first */
function* calls(messages: SessionLog.Message[]): Generator<SessionLog.ToolCall> {
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.kind === 'tool_call') yield part.call;
      if (part.kind === 'tool_batch') yield* part.calls;
    }
    if (message.children) yield* calls(message.children);
  }
}

function* allCalls(messages: SessionLog.Message[]): Generator<SessionLog.ToolCall> {
  for (const call of calls(messages)) {
    yield call;
    if (call.children) yield* allCalls(call.children);
  }
}

const cut = (text: string, limit: number) => Scrub.Class.truncate(text, limit);

function shrinkValue(value: unknown, limit: number): unknown {
  if (typeof value === 'string') return cut(value, limit);
  if (Array.isArray(value)) return value.slice(0, 200).map((entry) => shrinkValue(entry, limit));
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) output[key] = shrinkValue(entry, limit);
    return output;
  }
  return value;
}

let imagesKept = 0;
let imagesDropped = 0;

/** the structured result repeats what the text or the input already holds — keep one copy */
function dedupe(call: SessionLog.ToolCall) {
  const structured = call.result?.structured as Record<string, unknown> | null;
  if (!structured || typeof structured !== 'object' || !call.result) return;
  switch (call.name) {
    case 'Bash': {
      // stdout and stderr are the text; keep the structured fields, drop the copy
      if (typeof structured.stdout === 'string') call.result.text = '';
      break;
    }
    case 'Read': {
      // the text is the numbered listing; the raw content under file.content repeats it.
      // An image read carries its bytes as file.base64 — it joins the images budget.
      const file = structured.file as Record<string, unknown> | undefined;
      if (file && typeof file.content === 'string') file.content = '';
      if (file && typeof file.base64 === 'string' && file.base64) {
        call.result.images.push(`data:${String(file.type ?? 'image/png')};base64,${file.base64}`);
        file.base64 = '';
      }
      break;
    }
    case 'Write':
      // input.content is the file
      if (typeof structured.content === 'string') structured.content = '';
      break;
    case 'Edit':
      // input holds old_string and new_string; the patch is what renders
      structured.oldString = '';
      structured.newString = '';
      break;
  }
  if (typeof structured.originalFile === 'string') structured.originalFile = '';
}

function shrinkCall(call: SessionLog.ToolCall) {
  dedupe(call);
  // shell output is the bulk of a session; it gets the tighter cap
  const scale = call.name === 'Bash' ? 0.5 : 1;
  call.input = shrinkValue(call.input, CAPS.inputField * scale) as Record<string, unknown>;
  if (call.result) {
    call.result.text = cut(call.result.text, CAPS.resultText * scale);
    call.result.structured = shrinkValue(call.result.structured, CAPS.structuredField * scale);
    call.result.images = call.result.images.filter((image) => {
      const keep = imagesKept < CAPS.imageBudget && image.length <= CAPS.imageBytes;
      if (keep) imagesKept++;
      else imagesDropped++;
      return keep;
    });
  }
  if (call.children) shrinkMessages(call.children);
}

function shrinkMessages(messages: SessionLog.Message[]) {
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.kind === 'text') part.text = cut(part.text, CAPS.text);
      else if (part.kind === 'thinking') part.text = cut(part.text, CAPS.thinking);
      else if (part.kind === 'system') part.detail = cut(part.detail, CAPS.text);
      else if (part.kind === 'tool_call') shrinkCall(part.call);
      else if (part.kind === 'tool_batch') part.calls.forEach(shrinkCall);
    }
    if (message.children) shrinkMessages(message.children);
  }
}

async function main() {
  const started = performance.now();
  const { messages, parser } = await parseFile(input);
  const scrub = { ...parser.scrubCounts };

  // subagent transcripts live beside the session as <session>/subagents/agent-<id>.jsonl
  const sessionDir = join(dirname(input), basename(input, '.jsonl'), 'subagents');
  let subagents = 0;
  if (existsSync(sessionDir)) {
    const files = new Set(readdirSync(sessionDir));
    for (const call of calls(messages)) {
      if (call.name !== 'Agent') continue;
      const agentId = (call.result?.structured as { agentId?: string } | null)?.agentId;
      const file = agentId ? `agent-${agentId}.jsonl` : '';
      if (!file || !files.has(file)) continue;
      const thread = await parseFile(join(sessionDir, file));
      call.children = thread.messages;
      for (const [rule, count] of Object.entries(thread.parser.scrubCounts)) scrub[rule] = (scrub[rule] ?? 0) + count;
      subagents++;
    }
  }

  shrinkMessages(messages);

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const pages: { index: number; bytes: number; messages: number; firstId: string }[] = [];
  let totalBytes = 0;
  const survivors = new Set<string>();
  for (let start = 0; start < messages.length; start += PAGE_SIZE) {
    const slice = messages.slice(start, start + PAGE_SIZE);
    const json = JSON.stringify(slice);
    for (const pattern of Scrub.Class.survivors(json)) survivors.add(pattern);
    const index = pages.length;
    writeFileSync(join(outDir, `page-${String(index).padStart(3, '0')}.json`), json);
    pages.push({ index, bytes: json.length, messages: slice.length, firstId: slice[0].id });
    totalBytes += json.length;
  }

  // where the bytes are, for tuning the caps
  const weight: Record<string, number> = {};
  const add = (key: string, value: unknown) => (weight[key] = (weight[key] ?? 0) + JSON.stringify(value ?? '').length);
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.kind === 'text' || part.kind === 'thinking') add(part.kind, part.text);
      else if (part.kind === 'system') add('system', part.detail);
      else {
        const list = part.kind === 'tool_call' ? [part.call] : part.calls;
        for (const call of list) {
          add(`input:${call.name}`, call.input);
          add(`text:${call.name}`, call.result?.text);
          add(`structured:${call.name}`, call.result?.structured);
          add('images', call.result?.images);
          if (call.children) add('subagents', call.children);
        }
      }
    }
  }
  console.log('weight MB:', Object.entries(weight).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([key, bytes]) => `${key} ${(bytes / 1e6).toFixed(1)}`).join(', '));

  // the index: one small row per message, so the side panel lists and
  // filters the whole thread without a single content page
  const preview = (message: SessionLog.Message) => SessionLog.Class.messageText(message).replace(/\s+/g, ' ').trim().slice(0, 96);
  const toolCount = (message: SessionLog.Message) =>
    message.parts.reduce((count, part) => count + (part.kind === 'tool_call' ? 1 : part.kind === 'tool_batch' ? part.calls.length : 0), 0);
  const index = messages.map((message) => ({
    id: message.id,
    r: message.role[0],
    t: preview(message),
    c: toolCount(message),
    at: message.timestamp,
  }));
  const indexJson = JSON.stringify(index);
  for (const pattern of Scrub.Class.survivors(indexJson)) survivors.add(pattern);
  writeFileSync(join(outDir, 'index.json'), indexJson);
  console.log(`index.json ${(indexJson.length / 1e6).toFixed(2)} MB`);

  const models: Record<string, number> = {};
  const tools: Record<string, number> = {};
  let callCount = 0;
  for (const message of messages) if (message.model) models[message.model] = (models[message.model] ?? 0) + 1;
  for (const call of allCalls(messages)) {
    callCount++;
    tools[call.name] = (tools[call.name] ?? 0) + 1;
  }
  const meta = {
    builtAt: new Date().toISOString(),
    source: { file: basename(input), lines: parser.lines },
    count: messages.length,
    pageSize: PAGE_SIZE,
    pages,
    totalBytes,
    indexBytes: indexJson.length,
    firstAt: messages[0]?.timestamp ?? 0,
    lastAt: messages[messages.length - 1]?.timestamp ?? 0,
    roles: messages.reduce<Record<string, number>>((acc, message) => ((acc[message.role] = (acc[message.role] ?? 0) + 1), acc), {}),
    models,
    tools,
    calls: callCount,
    subagents,
    images: { kept: imagesKept, dropped: imagesDropped },
    scrub,
  };
  writeFileSync(join(outDir, 'meta.json'), JSON.stringify(meta, null, 2));

  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  console.log(`parsed ${parser.lines.toLocaleString()} lines → ${messages.length.toLocaleString()} messages in ${seconds}s`);
  console.log(`pages ${pages.length} × ${PAGE_SIZE}, ${(totalBytes / 1e6).toFixed(1)} MB, subagent threads folded: ${subagents}, images kept ${imagesKept} / dropped ${imagesDropped}`);
  const sizes = pages.map((page) => page.bytes).sort((a, b) => a - b);
  console.log(`page bytes: min ${(sizes[0] / 1e3).toFixed(0)}k median ${(sizes[sizes.length >> 1] / 1e3).toFixed(0)}k max ${(sizes[sizes.length - 1] / 1e3).toFixed(0)}k`);
  console.log('scrubbed:', Object.entries(scrub).map(([rule, count]) => `${rule} ×${count}`).join(', ') || 'nothing');
  console.log('tools:', Object.entries(tools).sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name} ${count}`).join(', '));
  if (survivors.size) {
    console.error(`FORBIDDEN PATTERNS SURVIVED: ${[...survivors].join(' | ')} — output removed`);
    rmSync(outDir, { recursive: true, force: true });
    process.exit(2);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

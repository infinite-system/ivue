/*
=== GENERATOR ===
Goal: Prove the files panel counts every file the loaded messages touched — reads, edits and writes, from single calls, batches and folded subagent threads — most touched first, and that opening a file asks the chat to search its name.
[Loading lives above the scroller](../ai-chat.invariants.md#loading-lives-above-the-scroller)
// domain-invariant: $FilesPanel — If a loaded message's call names a file, then the file is listed with its touches counted by kind; an unloaded row contributes nothing
Impossible if true: a file listed from a row whose page has not landed

=== GENERATOR-DESCRIBED ===
$FilesPanel walks the loaded rows' messages and their folded children for Read, Edit, NotebookEdit and Write calls, keyed by path.
*/
import { describe, expect, it, vi } from 'vitest';
import { Chat } from '../Chat';
import type { SessionLog } from '../SessionLog';
import { FilesPanel } from './FilesPanel';
import { hosted } from '../../virtual-scroller/hosted';

const call = (id: string, name: string, file_path: string): SessionLog.ToolCall => ({ id, name, input: { file_path }, state: 'done', result: null, durationMs: 1, startedAt: 0, children: null });
const message = (id: string, index: number, parts: SessionLog.Part[], children?: SessionLog.Message[]): SessionLog.Message => ({ id, index, role: 'assistant', timestamp: 1, parts, sidechain: false, children });

describe('FilesPanel', () => {
  // domain-invariant: $FilesPanel — If a loaded message's call names a file, then the file is listed with its touches counted by kind; an unloaded row contributes nothing
  // impossible-if-true: $FilesPanel — a file listed from a row whose page has not landed
  // invariant: Loading lives above the scroller (examples/playground/src/examples/ai-chat/ai-chat.invariants.md)
  it('counts reads, edits and writes per file across calls, batches and folded threads, most touched first, and opens a file as a search', () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    const host = hosted(() => new Chat.Class());
    const chat = host.instance;
    chat.applyIndex([
      { id: 'a', r: 'a', t: 'one', c: 1, at: 1 },
      { id: 'b', r: 'a', t: 'two', c: 3, at: 2 },
      { id: 'c', r: 'a', t: 'unloaded', c: 2, at: 3 },
    ]);
    chat.rows.value[0].message = message('a', 0, [{ kind: 'tool_call', call: call('1', 'Read', '/x/Chat.ts') }]);
    chat.rows.value[1].message = message('b', 1, [{ kind: 'tool_batch', calls: [call('2', 'Edit', '/x/Chat.ts'), call('3', 'Write', '/x/Index.ts'), call('4', 'Bash', '')], messageIds: ['b'] }], [
      message('b1', 1, [{ kind: 'tool_call', call: call('5', 'Read', '/x/Chat.ts') }]),
    ]);
    const panel = new FilesPanel.Class({ chat });
    expect(panel.files.map((file) => [file.name, file.count, file.reads, file.edits, file.writes])).toEqual([
      ['Chat.ts', 3, 2, 1, 0],
      ['Index.ts', 1, 0, 0, 1],
    ]);
    expect(panel.countLabel).toBe('2 files');
    expect(panel.touchesLabel(panel.files[0])).toBe('2 reads · 1 edit');
    expect(panel.files[0].dir).toBe('/x');
    panel.open(panel.files[1]);
    expect(chat.sidebarTab.value).toBe('Index');
    expect(chat.searchRequest.value).toBe('Index.ts');
    host.unmount();
  });
});

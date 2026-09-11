/*
=== GENERATOR ===
Goal: Prove the files panel counts every file the loaded messages touched — reads, edits and writes, from single calls, batches and folded subagent threads — most touched first, and that opening a file asks the chat to search its name; and that a file opens into its records as one flat list for the scroller, each record a diff of what its call did, and a record jumps the thread to its message.
[Loading lives above the scroller](../ai-chat.invariants.md#loading-lives-above-the-scroller)
// domain-invariant: $FilesPanel — If a loaded message's call names a file, then the file is listed with its touches counted by kind; an unloaded row contributes nothing
// domain-invariant: $FilesPanel — If a file is open, then its records follow it in the list, each a diff of its call; closed, the list holds files only
Impossible if true: a file listed from a row whose page has not landed

=== GENERATOR-DESCRIBED ===
$FilesPanel walks the loaded rows' messages and their folded children for Read, Edit, NotebookEdit and Write calls, keyed by path.
*/
import { describe, expect, it, vi } from 'vitest';
import { Chat } from '../Chat';
import type { SessionLog } from '../SessionLog';
import { FilesPanel } from './FilesPanel';
import { hosted } from '../../virtual-scroller/hosted';

const call = (id: string, name: string, file_path: string): SessionLog.ToolCall => ({
  id,
  name,
  input: { file_path },
  state: 'done',
  result: null,
  durationMs: 1,
  startedAt: 0,
  children: null
});
const message = (
  id: string,
  index: number,
  parts: SessionLog.Part[],
  children?: SessionLog.Message[]
): SessionLog.Message => ({
  id,
  index,
  role: 'assistant',
  timestamp: 1,
  parts,
  sidechain: false,
  children
});

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
      { id: 'c', r: 'a', t: 'unloaded', c: 2, at: 3 }
    ]);
    chat.rows.value[0].message = message('a', 0, [
      { kind: 'tool_call', call: call('1', 'Read', '/x/Chat.ts') }
    ]);
    chat.rows.value[1].message = message(
      'b',
      1,
      [
        {
          kind: 'tool_batch',
          calls: [
            call('2', 'Edit', '/x/Chat.ts'),
            call('3', 'Write', '/x/Index.ts'),
            call('4', 'Bash', '')
          ],
          messageIds: ['b']
        }
      ],
      [message('b1', 1, [{ kind: 'tool_call', call: call('5', 'Read', '/x/Chat.ts') }])]
    );
    const panel = new FilesPanel.Class({ chat });
    expect(
      panel.files.map((file) => [file.name, file.count, file.reads, file.edits, file.writes])
    ).toEqual([
      ['Chat.ts', 3, 2, 1, 0],
      ['Index.ts', 1, 0, 0, 1]
    ]);
    expect(panel.countLabel).toBe('2 files');
    expect(panel.touchesLabel(panel.files[0])).toBe('2 reads · 1 edit');
    expect(panel.files[0].dir).toBe('/x');
    // the search keeps the files whose path holds every word
    panel.query.value = 'index';
    expect(panel.files.map((file) => file.name)).toEqual(['Index.ts']);
    expect(panel.countLabel).toBe('1 file of 2');
    panel.query.value = 'x ts';
    expect(panel.count).toBe(2);
    panel.query.value = 'nothing';
    expect(panel.hasNoMatch).toBe(true);
    panel.clearQuery();
    expect(panel.count).toBe(2);
    // the kind pickers keep the files touched that way
    panel.setKind('writes');
    expect(panel.files.map((file) => file.name)).toEqual(['Index.ts']);
    panel.setKind('edits');
    expect(panel.files.map((file) => file.name)).toEqual(['Chat.ts']);
    expect(panel.isKind('edits')).toBe(true);
    expect(panel.countLabel).toBe('1 file of 2');
    panel.setKind('all');
    expect(panel.count).toBe(2);
    panel.open(panel.files[1]);
    expect(chat.sidebarTab.value).toBe('Index');
    expect(chat.searchRequest.value).toBe('Index.ts');
    host.unmount();
  });

  // domain-invariant: $FilesPanel — If a file is open, then its records follow it in the list, each a diff of its call; closed, the list holds files only
  it('opens a file into its records as diffs in one flat list, folds it back, and a record jumps the thread', () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    const host = hosted(() => new Chat.Class());
    const chat = host.instance;
    chat.applyIndex([{ id: 'a', r: 'a', t: 'one', c: 3, at: 1 }]);
    const edit = {
      ...call('1', 'Edit', '/x/Chat.ts'),
      input: { file_path: '/x/Chat.ts', old_string: 'a\nb', new_string: 'a\nc' }
    };
    const write = {
      ...call('2', 'Write', '/x/Chat.ts'),
      input: {
        file_path: '/x/Chat.ts',
        content: Array.from({ length: 30 }, (_, at) => `line ${at}`).join('\n')
      }
    };
    const read = {
      ...call('3', 'Read', '/x/Chat.ts'),
      input: { file_path: '/x/Chat.ts', offset: 10, limit: 5 }
    };
    chat.rows.value[0].message = message('a', 0, [
      { kind: 'tool_batch', calls: [edit, write, read], messageIds: ['a'] }
    ]);
    const panel = new FilesPanel.Class({ chat });
    const jumpTo = vi.spyOn(chat, 'jumpTo').mockImplementation(() => undefined);
    expect(panel.rows.value.map((row) => row.kind)).toEqual(['file']);
    expect(panel.isExpanded(panel.files[0])).toBe(false);
    panel.toggle(panel.files[0]);
    expect(panel.rows.value.map((row) => row.kind)).toEqual(['file', 'record', 'record', 'record']);
    expect(panel.rows.value.map((row) => row.id)).toEqual(['f:/x/Chat.ts', 'r:1', 'r:2', 'r:3']);
    const [, editRow, writeRow, readRow] = panel.rows.value;
    // a record is folded to its count first
    expect(panel.isRecordOpen(editRow.record as FilesPanel.Record)).toBe(false);
    expect(panel.diffSummary(editRow.record as FilesPanel.Record)).toBe('+2 −2');
    expect(panel.diffSummary(writeRow.record as FilesPanel.Record)).toBe('+30');
    expect(panel.diffSummary(readRow.record as FilesPanel.Record)).toBe(
      'read from line 10, 5 lines'
    );
    panel.toggleRecord(editRow.record as FilesPanel.Record);
    expect(panel.isRecordOpen(editRow.record as FilesPanel.Record)).toBe(true);
    expect(panel.recordClass(editRow.record as FilesPanel.Record)['ac-open']).toBe(true);
    panel.toggleRecord(editRow.record as FilesPanel.Record);
    expect(panel.isRecordOpen(editRow.record as FilesPanel.Record)).toBe(false);
    expect(panel.diffOf(editRow.record as FilesPanel.Record)).toEqual([
      { sign: '-', text: 'a' },
      { sign: '-', text: 'b' },
      { sign: '+', text: 'a' },
      { sign: '+', text: 'c' }
    ]);
    const writeDiff = panel.diffOf(writeRow.record as FilesPanel.Record);
    expect(writeDiff).toHaveLength(FilesPanel.$Class.DIFF_CAP + 1);
    expect(writeDiff[0]).toEqual({ sign: '+', text: 'line 0' });
    expect(writeDiff[FilesPanel.$Class.DIFF_CAP]).toEqual({ sign: ' ', text: '… 6 more lines' });
    expect(panel.diffOf(readRow.record as FilesPanel.Record)).toEqual([
      { sign: ' ', text: 'read from line 10, 5 lines' }
    ]);
    expect(panel.recordIndexLabel(editRow.record as FilesPanel.Record)).toBe('#1');
    expect(panel.rowText(editRow)).toBe('Edit #1\n-a\n-b\n+a\n+c');
    expect(panel.rowText(panel.rows.value[0])).toBe('/x/Chat.ts');
    panel.jump(editRow.record as FilesPanel.Record);
    expect(jumpTo).toHaveBeenCalledWith(0);
    panel.toggle(panel.files[0]);
    expect(panel.rows.value.map((row) => row.kind)).toEqual(['file']);
    host.unmount();
  });
});

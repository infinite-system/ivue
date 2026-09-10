/*
=== GENERATOR ===
Goal: Prove the index lists every message from the small index rows without a content page, filters by role, tool calls and text, seeks the chat on a click, and keeps a selection that is a set of ids with an anchor: click picks one, shift-click takes the range in the filtered order, ctrl-click toggles, a filter change loses nothing, and export leaves in thread order in the chosen form.
[Selection is a set of ids](./ai-chat.invariants.md#selection-is-a-set-of-ids)
// domain-invariant: $Index — If a filter changes, then every selected id stays selected
// domain-invariant: $Index — If the list is filtered or ordered, then it lands at its end in thread order and at its start when the newest is first, the way the chat opens at its end
// domain-invariant: $Index — If shift is held on a click, then every row between the anchor and the click in the filtered order joins the selection
Impossible if true: an export leaves in the order the rows were clicked

=== GENERATOR-DESCRIBED ===
$Index is the side panel: every message as one line, filters, a selection of ids with an anchor, export in thread order.
*/
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Chat } from './Chat';
import { ChatExport } from './ChatExport';
import { Index } from './Index';
import type { ChatApi } from './ChatApi';
import type { SessionLog } from './SessionLog';
import { hosted } from '../virtual-scroller/hosted';

const rows: ChatApi.IndexRow[] = [
  { id: 'a', r: 'u', t: 'hello there', c: 0, at: 1_700_000_000_000 },
  { id: 'b', r: 'a', t: 'running tools', c: 3, at: 1_700_000_060_000 },
  { id: 'c', r: 's', t: 'Turn took 4s', c: 0, at: 0 },
  { id: 'd', r: 'u', t: 'next question', c: 0, at: 1_700_000_120_000 },
  { id: 'e', r: 'a', t: 'plain answer', c: 0, at: 1_700_000_180_000 },
  { id: 'f', r: 'a', t: 'more tools', c: 1, at: 1_700_000_240_000 },
];

function make() {
  // the hosted chat's own load must not reach the network
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
  const host = hosted(() => new Chat.Class());
  const chat = host.instance;
  chat.applyIndex(rows);
  // the index is hosted too: its constructor lands the list on mount and after every filtering
  const indexHost = hosted(() => new Index.Class({ chat }));
  const index = indexHost.instance;
  return {
    chat,
    index,
    unmount: () => {
      indexHost.unmount();
      host.unmount();
    },
  };
}

const click = (extra: Partial<MouseEvent> = {}) => ({ shiftKey: false, metaKey: false, ctrlKey: false, ...extra }) as MouseEvent;

describe('Index', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // domain-invariant: $Index — If the list is filtered or ordered, then it lands at its end in thread order and at its start when the newest is first, the way the chat opens at its end
  it('lands at the end of the list in thread order, at the start when the newest is first, and reverses on demand', async () => {
    const { index, unmount } = make();
    const seeks: number[] = [];
    index.scroller.value = { scrollToIndex: (at: number) => seeks.push(at) } as never;
    index.landAfterFilter();
    expect(seeks).toEqual([5]); // the end, like the chat
    index.setOrder('newest');
    expect(index.rows.value.map((row) => row.id)).toEqual(['f', 'e', 'd', 'c', 'b', 'a']);
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(seeks.at(-1)).toBe(0); // the start: the newest is first now
    index.setRole('user');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(index.rows.value.map((row) => row.id)).toEqual(['d', 'a']);
    expect(seeks.at(-1)).toBe(0);
    index.setOrder('oldest');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(index.rows.value.map((row) => row.id)).toEqual(['a', 'd']);
    expect(seeks.at(-1)).toBe(1);
    unmount();
  });

  it('lists every message from the index rows and filters by role, tool calls and text', () => {
    const { index, unmount } = make();
    expect(index.count).toBe(6);
    expect(index.countLabel).toBe('6 messages');
    index.setRole('user');
    expect(index.rows.value.map((row) => row.id)).toEqual(['a', 'd']);
    expect(index.countLabel).toBe('2 of 6');
    index.setRole('assistant');
    index.setTools('only');
    expect(index.rows.value.map((row) => row.id)).toEqual(['b', 'f']);
    index.setTools('exclude');
    expect(index.rows.value.map((row) => row.id)).toEqual(['e']);
    index.setRole('all');
    index.setTools('include');
    index.query.value = 'TOOLS';
    expect(index.rows.value.map((row) => row.id)).toEqual(['b', 'f']);
    index.clearQuery();
    expect(index.count).toBe(6);
    expect(index.isRole('all')).toBe(true);
    expect(index.isTools('include')).toBe(true);
    const row = index.rows.value[1];
    expect(index.roleMark(row)).toBe('agent');
    expect(index.roleClass(row)).toBe('ix-role-a');
    expect(index.toolsLabel(row)).toBe('3 tools');
    expect(index.toolsLabel(index.rows.value[5])).toBe('1 tool');
    expect(index.timeLabel(index.rows.value[2])).toBe('');
    expect(index.timeLabel(row)).toMatch(/^\d\d:\d\d$/);
    expect(index.rowText(row)).toBe('agent running tools');
    expect(index.previewText({ ...row, entry: { ...row.entry, t: '' } })).toBe('(no text)');
    unmount();
  });

  // domain-invariant: $Index — If shift is held on a click, then every row between the anchor and the click in the filtered order joins the selection
  // domain-invariant: $Index — If a filter changes, then every selected id stays selected
  // invariant: Selection is a set of ids (examples/playground/src/examples/ai-chat/ai-chat.invariants.md)
  it('click picks one and anchors, shift-click takes the range in filtered order, ctrl-click toggles, and a filter keeps the picks', () => {
    const { index, unmount } = make();
    index.setRole('assistant');
    const [b, e, f] = index.rows.value;
    index.onRowClick(b, click());
    expect([...index.selected.value]).toEqual(['b']);
    expect(index.anchorId.value).toBe('b');
    index.onRowClick(f, click({ shiftKey: true }));
    expect([...index.selected.value].sort()).toEqual(['b', 'e', 'f']);
    index.onRowClick(e, click({ ctrlKey: true }));
    expect([...index.selected.value].sort()).toEqual(['b', 'f']);
    expect(index.anchorId.value).toBe('b');
    index.setRole('all');
    expect([...index.selected.value].sort()).toEqual(['b', 'f']);
    expect(index.selectedLabel).toBe('2 selected');
    expect(index.isSelected(index.rows.value[1])).toBe(true);
    expect(index.rowClass(index.rows.value[1])).toMatchObject({ 'ac-selected': true });
    index.toggleAllShown();
    expect(index.selectedCount).toBe(6);
    expect(index.allShownSelected).toBe(true);
    expect(index.selectAllLabel).toBe('Clear shown');
    index.toggleAllShown();
    expect(index.selectedCount).toBe(0);
    index.onRowCheck(index.rows.value[2], { stopPropagation() {} } as Event);
    expect([...index.selected.value]).toEqual(['c']);
    index.clearSelection();
    expect(index.hasSelection).toBe(false);
    expect(index.anchorId.value).toBeNull();
    // a shift-click with an unknown anchor selects nothing extra
    index.anchorId.value = 'ghost';
    index.onRowClick(index.rows.value[0], click({ shiftKey: true }));
    expect(index.selectedCount).toBe(0);
    unmount();
  });

  it('keyboard: arrows move, shift extends, space picks, enter seeks, escape closes', () => {
    const { chat, index, unmount } = make();
    const jump = vi.spyOn(chat, 'jumpTo');
    const key = (key: string, shiftKey = false) => ({ key, shiftKey, preventDefault() {} }) as KeyboardEvent;
    index.onKeydown(key('ArrowDown'));
    index.onKeydown(key('ArrowDown', true));
    expect(index.focusedIndex.value).toBe(2);
    expect([...index.selected.value].sort()).toEqual(['b', 'c']);
    index.onKeydown(key(' '));
    expect(index.isSelected(index.rows.value[2])).toBe(false);
    index.onKeydown(key('ArrowUp'));
    index.onKeydown(key('Enter'));
    expect(jump).toHaveBeenCalledWith(1);
    chat.openSidebar('Index');
    index.onKeydown(key('Escape'));
    expect(chat.indexOpen).toBe(false);
    expect(index.isFocusedRow(index.rows.value[1])).toBe(true);
    index.onRowDoubleClick(index.rows.value[4]);
    expect(jump).toHaveBeenLastCalledWith(4);
    expect(index.isCurrent(index.rows.value[4])).toBe(true);
    unmount();
  });

  // impossible-if-true: $Index — an export leaves in the order the rows were clicked
  it('export gathers the selection in thread order in each form, downloads, and copies markdown', async () => {
    const { chat, index, unmount } = make();
    const messages: SessionLog.Message[] = [
      { id: 'a', index: 0, role: 'user', timestamp: 1_700_000_000_000, parts: [{ kind: 'text', text: 'hello **there**' }], sidechain: false },
      { id: 'b', index: 1, role: 'assistant', timestamp: 1_700_000_060_000, parts: [{ kind: 'thinking', text: 'plan\nmore', durationMs: 1 }, { kind: 'tool_call', call: { id: 'c1', name: 'Bash', input: { command: 'ls' }, state: 'done', result: { text: 'out', images: [], isError: false, structured: null }, durationMs: 1, startedAt: 0, children: null } }], sidechain: false },
      { id: 'c', index: 2, role: 'system', timestamp: 0, parts: [{ kind: 'system', subtype: 'turn_duration', text: 'Turn took 4s', detail: '', durationMs: 4000 }], sidechain: false },
    ];
    vi.spyOn(chat, 'messagesFor').mockImplementation(async (ids) => messages.filter((entry) => ids.has(entry.id)));
    index.onRowClick(index.rows.value[2], click());
    index.onRowClick(index.rows.value[0], click({ ctrlKey: true }));
    index.onRowClick(index.rows.value[1], click({ ctrlKey: true }));
    const markdown = await index.exportText();
    expect(markdown.indexOf('## user')).toBeLessThan(markdown.indexOf('## assistant'));
    expect(markdown).toContain('> thinking: plan\n> more');
    expect(markdown).toContain('**Bash**\n\n```json\n{\n  "command": "ls"\n}\n```\n\n```\nout\n```');
    expect(markdown).toContain('## system');
    index.exportForm.value = 'plain';
    expect(await index.exportText()).toContain('[user] 2023-11-14T22:13:20.000Z\n\nhello **there**');
    index.exportForm.value = 'jsonl';
    const jsonl = await index.exportText();
    expect(jsonl.split('\n').map((line) => (JSON.parse(line) as SessionLog.Message).id)).toEqual(['a', 'b', 'c']);
    expect(ChatExport.Class.text(messages, 'plain')).toContain('thinking: plan\nmore');
    expect(ChatExport.Class.text(messages, 'plain')).toContain('Bash {\n  "command": "ls"\n}\nout');

    const save = vi.spyOn(Index.Class, 'saveFile').mockImplementation(() => {});
    await index.download();
    expect(save).toHaveBeenCalledWith(jsonl, 'chat-selection.jsonl');
    expect(index.exportLabel).toBe('Export JSONL');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await index.copyMarkdown();
    expect(writeText).toHaveBeenCalledWith(markdown);
    expect(index.copyLabel).toBe('Copied');
    writeText.mockRejectedValueOnce(new Error('denied'));
    await index.copyMarkdown();
    expect(index.copied.value).toBe(false);
    unmount();
  });
});

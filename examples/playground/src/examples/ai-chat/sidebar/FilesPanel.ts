import { computed, ref, shallowRef } from 'vue';
import { Reactive } from '../../../ivue';
import { Static } from '../../../Static';
import { Kit } from '../../../kit/Kit';
import { VirtualScroller } from '../../virtual-scroller/VirtualScroller';
import VirtualScrollerView from '../../virtual-scroller/VirtualScroller.vue';
import type { Chat } from '../Chat';
import { Icons } from '../Icons';
import type { SessionLog } from '../SessionLog';

// The files this session touched, read off the loaded messages: every
// Read, Edit and Write call names a path, and this panel counts them per
// file and keeps the calls as the file's records. Pages load on demand,
// so the list grows as the reader moves; the head says how much of the
// thread it has seen. The list is a virtual scroller: a file opens into
// its records, each a diff of what the call did, and a record jumps the
// thread to its message. The index button opens the index on the file.
class $FilesPanel {
  /** the one role the panel composes: its own scroller over files and their open records */
  static get $kit() {
    return {
      Scroller: { namespace: VirtualScroller, vue: VirtualScrollerView },
    } satisfies Kit.Of<FilesPanel.Role>;
  }

  static readonly FILE_TOOLS: Record<string, keyof FilesPanel.Counts> = { Read: 'reads', Edit: 'edits', NotebookEdit: 'edits', Write: 'writes' };
  /** a record's diff shows this many lines before it folds */
  static readonly DIFF_CAP = 24;

  constructor(public props: FilesPanel.Props) {}

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $FilesPanel;
  }

  get kit() {
    return this.self.$kit;
  }

  get searchIcon(): string {
    return Icons.$Class.PATHS.search;
  }

  get chat(): Chat.Model {
    return this.props.chat;
  }

  /** the paths whose records are open */
  get expanded() {
    return shallowRef<Set<string>>(new Set());
  }

  /** the records whose diff is unfolded — a record shows its count first */
  get openRecords() {
    return shallowRef<Set<string>>(new Set());
  }

  get query() {
    return ref('');
  }

  // TEMPLATE-REF TARGET — the search box
  get searchElement() {
    return ref<HTMLInputElement | null>(null);
  }

  // TEMPLATE-REF TARGET — the panel's own scroller
  get scroller() {
    return ref<VirtualScroller.Exposed<FilesPanel.Row> | null>(null);
  }

  // computed: stable-handle — the scroller's modelValue must be ONE list per
  // change of files or expansion, not a fresh array per read
  get rows() {
    return computed(() => this.flatten());
  }

  /** every file named by a loaded call, most touched first */
  get allFiles(): FilesPanel.File[] {
    void this.chat.revision.value;
    const files = new Map<string, FilesPanel.File>();
    for (const row of this.chat.rows.value) {
      if (!row.message) continue;
      this.collect(row.message, files);
    }
    return [...files.values()].sort((left, right) => right.count - left.count || left.path.localeCompare(right.path));
  }

  /** the files the search leaves: every word of the query somewhere in the path */
  get files(): FilesPanel.File[] {
    const words = this.query.value.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return this.allFiles;
    return this.allFiles.filter((file) => {
      const path = file.path.toLowerCase();
      return words.every((word) => path.includes(word));
    });
  }

  get count(): number {
    return this.files.length;
  }

  get isFiltered(): boolean {
    return this.query.value.trim().length > 0;
  }

  get hasFiles(): boolean {
    return this.count > 0;
  }

  get coverageLabel(): string {
    return `from ${this.chat.loadedLabel} messages loaded`;
  }

  get countLabel(): string {
    const count = this.count === 1 ? '1 file' : `${this.count.toLocaleString('en-US')} files`;
    return this.isFiltered ? `${count} of ${this.allFiles.length.toLocaleString('en-US')}` : count;
  }

  get hasNoMatch(): boolean {
    return this.isFiltered && this.count === 0;
  }

  isFile(row: FilesPanel.Row): boolean {
    return row.kind === 'file';
  }

  isExpanded(file: FilesPanel.File): boolean {
    return this.expanded.value.has(file.path);
  }

  toggleGlyph(file: FilesPanel.File): string {
    return this.isExpanded(file) ? '▾' : '▸';
  }

  fileClass(row: FilesPanel.Row): Record<string, boolean> {
    return { 'ac-open': this.isExpanded(row.file) };
  }

  recordLabel(record: FilesPanel.Record): string {
    return record.tool;
  }

  recordClass(record: FilesPanel.Record): Record<string, boolean> {
    return { [`ac-rec-${record.kind}`]: true, 'ac-open': this.isRecordOpen(record) };
  }

  isRecordOpen(record: FilesPanel.Record): boolean {
    return this.openRecords.value.has(record.id);
  }

  recordGlyph(record: FilesPanel.Record): string {
    return this.isRecordOpen(record) ? '▾' : '▸';
  }

  /** the record folded: how many lines it added and removed, or what it read */
  diffSummary(record: FilesPanel.Record): string {
    if (record.kind === 'reads') return this.diffOf(record)[0].text;
    const input = record.call.input;
    const added = record.kind === 'writes' ? this.lineCount(input.content) : this.lineCount(input.new_string ?? input.new_source);
    const removed = record.kind === 'writes' ? 0 : this.lineCount(input.old_string ?? input.old_source);
    const pieces: string[] = [];
    if (added) pieces.push(`+${added.toLocaleString('en-US')}`);
    if (removed) pieces.push(`−${removed.toLocaleString('en-US')}`);
    return pieces.join(' ') || 'no change';
  }

  recordIndexLabel(record: FilesPanel.Record): string {
    return `#${(record.messageIndex + 1).toLocaleString('en-US')}`;
  }

  recordTimeLabel(record: FilesPanel.Record): string {
    const date = new Date(record.at);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  /** what the call did to the file, as diff lines: an edit's old and new, a write's content, a read's range */
  diffOf(record: FilesPanel.Record): FilesPanel.DiffLine[] {
    const input = record.call.input;
    const lines: FilesPanel.DiffLine[] = [];
    if (record.kind === 'reads') {
      const offset = input.offset;
      const limit = input.limit;
      const range = offset === undefined && limit === undefined ? 'whole file' : `from line ${Number(offset ?? 1).toLocaleString('en-US')}${limit !== undefined ? `, ${Number(limit).toLocaleString('en-US')} lines` : ''}`;
      return [{ sign: ' ', text: `read ${range}` }];
    }
    if (record.kind === 'writes') {
      for (const line of String(input.content ?? '').split('\n')) lines.push({ sign: '+', text: line });
    } else {
      for (const line of String(input.old_string ?? input.old_source ?? '').split('\n')) if (line || lines.length) lines.push({ sign: '-', text: line });
      for (const line of String(input.new_string ?? input.new_source ?? '').split('\n')) lines.push({ sign: '+', text: line });
    }
    const cap = this.self.DIFF_CAP;
    if (lines.length <= cap) return lines;
    return [...lines.slice(0, cap), { sign: ' ', text: `… ${(lines.length - cap).toLocaleString('en-US')} more lines` }];
  }

  lineClass(line: FilesPanel.DiffLine): Record<string, boolean> {
    return { 'ac-dl-add': line.sign === '+', 'ac-dl-del': line.sign === '-', 'ac-dl-ctx': line.sign === ' ' };
  }

  /** the plain text a row projects, for the scroller's copy */
  rowText(row: FilesPanel.Row): string {
    if (row.kind === 'file') return row.file.path;
    const record = row.record as FilesPanel.Record;
    return `${record.tool} ${this.recordIndexLabel(record)}\n${this.diffOf(record)
      .map((line) => `${line.sign}${line.text}`)
      .join('\n')}`;
  }

  touchesLabel(file: FilesPanel.File): string {
    const pieces: string[] = [];
    if (file.reads) pieces.push(`${file.reads} read${file.reads === 1 ? '' : 's'}`);
    if (file.edits) pieces.push(`${file.edits} edit${file.edits === 1 ? '' : 's'}`);
    if (file.writes) pieces.push(`${file.writes} write${file.writes === 1 ? '' : 's'}`);
    return pieces.join(' · ');
  }

  /** open the index on the messages that touched this file */
  open(file: FilesPanel.File) {
    this.chat.search(file.name);
  }

  /** a record unfolds its diff, or folds it back to the count */
  toggleRecord(record: FilesPanel.Record) {
    const next = new Set(this.openRecords.value);
    if (next.has(record.id)) next.delete(record.id);
    else next.add(record.id);
    this.openRecords.value = next;
  }

  clearQuery() {
    this.query.value = '';
    this.searchElement.value?.focus();
  }

  /** a file opens into its records, or folds them away */
  toggle(file: FilesPanel.File) {
    const next = new Set(this.expanded.value);
    if (next.has(file.path)) next.delete(file.path);
    else next.add(file.path);
    this.expanded.value = next;
  }

  /** a record jumps the thread to the message that made it */
  jump(record: FilesPanel.Record) {
    this.chat.jumpTo(record.messageIndex);
  }

  /** files in order, each followed by its records when open */
  protected flatten(): FilesPanel.Row[] {
    const rows: FilesPanel.Row[] = [];
    for (const file of this.files) {
      rows.push({ id: `f:${file.path}`, body: '', position: String(rows.length + 1), kind: 'file', file, record: null });
      if (!this.expanded.value.has(file.path)) continue;
      for (const record of file.records) rows.push({ id: `r:${record.id}`, body: '', position: String(rows.length + 1), kind: 'record', file, record });
    }
    return rows;
  }

  protected lineCount(text: unknown): number {
    const value = String(text ?? '');
    return value ? value.split('\n').length : 0;
  }

  protected collect(message: SessionLog.Message, files: Map<string, FilesPanel.File>) {
    for (const part of message.parts) {
      const calls = part.kind === 'tool_call' ? [part.call] : part.kind === 'tool_batch' ? part.calls : [];
      for (const call of calls) {
        const kind = this.self.FILE_TOOLS[call.name];
        const path = call.input.file_path ?? call.input.notebook_path;
        if (!kind || typeof path !== 'string' || !path) continue;
        const file = files.get(path) ?? { path, name: path.split('/').pop() ?? path, dir: path.split('/').slice(0, -1).join('/'), reads: 0, edits: 0, writes: 0, count: 0, lastIndex: message.index, records: [] };
        file[kind] += 1;
        file.count += 1;
        file.records.push({ id: call.id, tool: call.name, kind, messageIndex: message.index, at: message.timestamp, call });
        file.lastIndex = Math.max(file.lastIndex, message.index);
        files.set(path, file);
      }
    }
    for (const child of message.children ?? []) this.collect(child, files);
  }
}

export namespace FilesPanel {
  export const $Class = Static($FilesPanel);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export interface Props {
    chat: Chat.Model;
    kit?: Kit.Entry;
  }

  export interface Counts {
    reads: number;
    edits: number;
    writes: number;
  }

  export type Role = 'Scroller';

  export interface File extends Counts {
    path: string;
    name: string;
    dir: string;
    count: number;
    lastIndex: number;
    /** every call that touched it, in thread order */
    records: Record[];
  }

  export interface Record {
    id: string;
    tool: string;
    kind: keyof Counts;
    messageIndex: number;
    at: number;
    call: SessionLog.ToolCall;
  }

  export interface DiffLine {
    sign: '+' | '-' | ' ';
    text: string;
  }

  export interface Row extends VirtualScroller.BaseItem {
    kind: 'file' | 'record';
    file: File;
    record: Record | null;
  }
}

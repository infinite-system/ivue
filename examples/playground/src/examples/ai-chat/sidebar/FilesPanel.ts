import { Reactive } from '../../../ivue';
import { Static } from '../../../Static';
import type { Kit } from '../../../kit/Kit';
import type { Chat } from '../Chat';
import type { SessionLog } from '../SessionLog';

// The files this session touched, read off the loaded messages: every
// Read, Edit and Write call names a path, and this panel counts them per
// file. Pages load on demand, so the list grows as the reader moves; the
// head says how much of the thread it has seen. A file opens the index
// filtered to the messages that touched it.
class $FilesPanel {
  static readonly FILE_TOOLS: Record<string, keyof FilesPanel.Counts> = { Read: 'reads', Edit: 'edits', NotebookEdit: 'edits', Write: 'writes' };

  constructor(public props: FilesPanel.Props) {}

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $FilesPanel;
  }

  get chat(): Chat.Model {
    return this.props.chat;
  }

  /** every file named by a loaded call, most touched first */
  get files(): FilesPanel.File[] {
    void this.chat.revision.value;
    const files = new Map<string, FilesPanel.File>();
    for (const row of this.chat.rows.value) {
      if (!row.message) continue;
      this.collect(row.message, files);
    }
    return [...files.values()].sort((left, right) => right.count - left.count || left.path.localeCompare(right.path));
  }

  get count(): number {
    return this.files.length;
  }

  get hasFiles(): boolean {
    return this.count > 0;
  }

  get coverageLabel(): string {
    return `from ${this.chat.loadedLabel} messages loaded`;
  }

  get countLabel(): string {
    return this.count === 1 ? '1 file' : `${this.count.toLocaleString('en-US')} files`;
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

  protected collect(message: SessionLog.Message, files: Map<string, FilesPanel.File>) {
    for (const part of message.parts) {
      const calls = part.kind === 'tool_call' ? [part.call] : part.kind === 'tool_batch' ? part.calls : [];
      for (const call of calls) {
        const kind = this.self.FILE_TOOLS[call.name];
        const path = call.input.file_path ?? call.input.notebook_path;
        if (!kind || typeof path !== 'string' || !path) continue;
        const file = files.get(path) ?? { path, name: path.split('/').pop() ?? path, dir: path.split('/').slice(0, -1).join('/'), reads: 0, edits: 0, writes: 0, count: 0, lastIndex: message.index };
        file[kind] += 1;
        file.count += 1;
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

  export interface File extends Counts {
    path: string;
    name: string;
    dir: string;
    count: number;
    lastIndex: number;
  }
}

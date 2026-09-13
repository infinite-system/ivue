import { Reactive } from '../../../../../ivue';
import { Static } from '../../../../../Static';
import { ToolCall } from './ToolCall';

// A shell call: the command as a shell block, stdout and stderr as
// terminal blocks with ANSI stripped, the exit state marked.
class $ToolCallBash extends ToolCall.$Class {
  static readonly ANSI = /\x1b\[[0-9;]*[A-Za-z]/g;

  /**
   * A one-line command chained with `;`, `&&`, `||` or a pipe breaks at
   * each chain point, the continuation indented, so a long line reads as
   * the steps it is — and pastes into a shell as written: `;` ends its
   * line, and `&&`, `||` and `|` trail theirs, which is where a shell
   * continues a line without a backslash (a line that starts with `&&` is
   * a syntax error). Separators inside quotes are left alone, and a
   * command the author already broke across lines is shown as written.
   */
  static breakLines(command: string): string {
    if (command.includes('\n')) return command;
    let output = '';
    let quote: string | null = null;
    for (let at = 0; at < command.length; at++) {
      const char = command[at];
      if (quote) {
        output += char;
        if (char === quote && command[at - 1] !== '\\') quote = null;
        continue;
      }
      if (char === '"' || char === "'" || char === '`') {
        quote = char;
        output += char;
        continue;
      }
      const two = command.slice(at, at + 2);
      if (two === '&&' || two === '||') {
        output = output.trimEnd() + ' ' + two + '\n  ';
        at += 1;
        while (command[at + 1] === ' ') at++;
        continue;
      }
      if (char === ';') {
        output = output.trimEnd() + ';\n';
        while (command[at + 1] === ' ') at++;
        continue;
      }
      if (char === '|') {
        output = output.trimEnd() + ' |\n  ';
        while (command[at + 1] === ' ') at++;
        continue;
      }
      output += char;
    }
    return output;
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected override get self() {
    return this.constructor as typeof $ToolCallBash;
  }

  get command(): string {
    return String(this.input.command ?? '');
  }

  /** the command as the block shows it: one chain step per line */
  get commandText(): string {
    return this.self.breakLines(this.command);
  }

  get description(): string {
    return String(this.input.description ?? '');
  }

  override get caption(): string {
    return this.description;
  }

  get stdout(): string {
    const structured = this.structured;
    const text = typeof structured.stdout === 'string' ? structured.stdout : this.resultText;
    return text.replace(this.self.ANSI, '');
  }

  get stderr(): string {
    const structured = this.structured;
    return typeof structured.stderr === 'string'
      ? structured.stderr.replace(this.self.ANSI, '')
      : '';
  }

  get wasInterrupted(): boolean {
    return Boolean(this.structured.interrupted);
  }

  get ranInBackground(): boolean {
    return Boolean(this.input.run_in_background);
  }

  get exitLabel(): string {
    if (this.isRunning) return 'running';
    if (this.wasInterrupted) return 'interrupted';
    if (this.isFailed) return 'failed';
    return 'exit 0';
  }

  get hasStdout(): boolean {
    return this.stdout.trim().length > 0;
  }

  get hasStderr(): boolean {
    return this.stderr.trim().length > 0;
  }

  get hasNoOutput(): boolean {
    return this.hasResult && !this.hasStdout && !this.hasStderr;
  }

  override get sections(): ToolCall.Section[] {
    const sections: ToolCall.Section[] = [
      {
        title: 'command',
        code: this.commandText,
        lang: 'bash',
        tags: this.ranInBackground ? [{ text: 'background' }] : []
      }
    ];
    if (this.hasStdout)
      sections.push({
        title: 'stdout',
        code: this.stdout,
        lang: 'text',
        tags: [{ text: this.exitLabel, class: this.stateClass }]
      });
    if (this.hasStderr)
      sections.push({ title: 'stderr', code: this.stderr, lang: 'text', tone: 'error' });
    if (this.hasNoOutput)
      sections.push({
        title: 'output',
        code: '',
        lang: 'text',
        note: `no output · ${this.exitLabel}`
      });
    return sections;
  }
}

export namespace ToolCallBash {
  export const $Class = Static($ToolCallBash);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
}

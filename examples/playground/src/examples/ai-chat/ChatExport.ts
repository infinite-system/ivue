import { Static } from '../../Static';
import { SessionLog } from './SessionLog';
import type { Chat } from './Chat';

// The export forms a selection leaves as: Markdown with role headings and
// tool calls as fenced blocks, plain text, or JSONL of the parsed
// messages — always in thread order.
class $ChatExport {
  static text(messages: SessionLog.Message[], form: Chat.ExportForm): string {
    if (form === 'jsonl') return messages.map((message) => JSON.stringify(message)).join('\n');
    return messages
      .map((message) => {
        const stamp = message.timestamp ? new Date(message.timestamp).toISOString() : '';
        const heading = form === 'markdown' ? `## ${message.role}${stamp ? ` · ${stamp}` : ''}` : `[${message.role}]${stamp ? ` ${stamp}` : ''}`;
        const body = message.parts.map((part) => this.part(part, form)).join('\n\n');
        return `${heading}\n\n${body}`;
      })
      .join('\n\n');
  }

  static part(part: SessionLog.Part, form: Chat.ExportForm): string {
    if (part.kind === 'text') return part.text;
    if (part.kind === 'thinking') return form === 'markdown' ? `> thinking: ${part.text.replace(/\n/g, '\n> ')}` : `thinking: ${part.text}`;
    if (part.kind === 'tool_call' || part.kind === 'tool_batch') {
      const calls = part.kind === 'tool_call' ? [part.call] : part.calls;
      return calls
        .map((call) => {
          const input = JSON.stringify(call.input, null, 2);
          const output = call.result?.text ?? '';
          return form === 'markdown' ? `**${call.name}**\n\n\`\`\`json\n${input}\n\`\`\`${output ? `\n\n\`\`\`\n${output}\n\`\`\`` : ''}` : `${call.name} ${input}${output ? `\n${output}` : ''}`;
        })
        .join('\n\n');
    }
    return SessionLog.Class.partText(part);
  }
}

export namespace ChatExport {
  export const $Class = Static($ChatExport);
  export let Class = $Class;
}


import { Reactive } from '../../../ivue';
import type { Chat } from '../Chat';
import type { SessionLog } from '../SessionLog';

// A nested thread (a subagent's run) inside a card: the messages as
// rows the message component understands, rendered in flow — a nested
// thread is short, so it is not virtualized.
class $SubThread {
  constructor(public props: SubThread.Props) {}

  get rows(): Chat.Row[] {
    return this.props.messages.map((message, at) => ({
      id: message.id,
      body: '',
      position: String(at + 1),
      index: at,
      page: -1,
      role: message.role,
      preview: '',
      message,
    }));
  }

  get countLabel(): string {
    const count = this.rows.length;
    return `${count.toLocaleString('en-US')} message${count === 1 ? '' : 's'}`;
  }
}

export namespace SubThread {
  export const $Class = $SubThread;
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export interface Props {
    messages: SessionLog.Message[];
    chat: Chat.Model;
  }
}

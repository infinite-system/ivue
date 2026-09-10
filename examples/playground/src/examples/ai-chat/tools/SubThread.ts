import { Reactive } from '../../../ivue';
import { Static } from '../../../Static';
import { Kit } from '../../../kit/Kit';
import { ChatMessage } from '../ChatMessage';
import ChatMessageView from '../ChatMessage.vue';
import type { Chat } from '../Chat';
import type { SessionLog } from '../SessionLog';

// A nested thread (a subagent's run) inside a card: the messages as
// rows the message component understands, rendered in flow — a nested
// thread is short, so it is not virtualized.
class $SubThread {
  /** the one role a thread composes: a row per message, the same row the top thread renders */
  static get $kit() {
    return {
      Message: { namespace: ChatMessage, vue: ChatMessageView },
    } satisfies Kit.Of<'Message'>;
  }

  constructor(public props: SubThread.Props) {}

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $SubThread;
  }

  get kit() {
    return this.self.$kit;
  }

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
  export const $Class = Static($SubThread);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export interface Props {
    messages: SessionLog.Message[];
    chat: Chat.Model;
    kit?: Kit.Entry;
  }
}

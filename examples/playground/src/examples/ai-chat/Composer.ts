import { ref, shallowRef } from 'vue';
import { Reactive } from '../../ivue';
import { Static } from '../../Static';
import { ChatApi } from './ChatApi';
import type { Chat } from './Chat';
import type { Kit } from '../../kit/Kit';
import type { SessionLog } from './SessionLog';

// The input row: a draft, the picked model, attachments that came in by
// drop, paste or the picker (through the upload mock, never the
// network), and a send that hands the thread one request. Enter sends,
// Shift+Enter breaks a line.
class $Composer {
  static readonly DEFAULT_MODEL = 'default';

  constructor(public props: Composer.Props) {}

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $Composer;
  }

  get chat(): Chat.Model {
    return this.props.chat;
  }

  get draft() {
    return ref('');
  }

  get modelId() {
    return ref(this.self.DEFAULT_MODEL);
  }

  get attachments() {
    return shallowRef<SessionLog.AttachmentPart[]>([]);
  }

  get uploading() {
    return ref(0);
  }

  get dragOver() {
    return ref(false);
  }

  // TEMPLATE-REF TARGET — the textarea, for focus after send
  get inputElement() {
    return ref<HTMLTextAreaElement | null>(null);
  }

  /* ---- derived ---- */

  get models(): ChatApi.Model[] {
    return ChatApi.Class.MODELS;
  }

  get model(): ChatApi.Model {
    return ChatApi.Class.model(this.modelId.value);
  }

  get modelHint(): string {
    return `${this.model.detail} · first token ~${(this.model.firstTokenMs / 1000).toFixed(1)}s · ${this.model.tokensPerSecond} tok/s`;
  }

  get hasContent(): boolean {
    return this.draft.value.trim().length > 0 || this.attachments.value.length > 0;
  }

  get canSend(): boolean {
    return this.hasContent && !this.chat.isStreaming && this.uploading.value === 0;
  }

  get sendLabel(): string {
    return this.chat.isStreaming ? 'Replying…' : 'Send';
  }

  get placeholder(): string {
    return this.chat.isStreaming ? 'The reply is streaming — a replay of a real turn' : 'Type a message, drop an image or a file. Enter sends, Shift+Enter breaks the line.';
  }

  get attachmentCountLabel(): string {
    const count = this.attachments.value.length;
    return count === 1 ? '1 attachment' : `${count} attachments`;
  }

  isImage(attachment: SessionLog.AttachmentPart): boolean {
    return attachment.mimeType.startsWith('image/');
  }

  sizeLabel(attachment: SessionLog.AttachmentPart): string {
    const size = attachment.size;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  /* ---- handlers ---- */

  onKeydown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.chat.search('');
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.send();
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragOver.value = true;
  }

  onDragLeave() {
    this.dragOver.value = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragOver.value = false;
    void this.attach(Array.from(event.dataTransfer?.files ?? []));
  }

  onPaste(event: ClipboardEvent) {
    const files = Array.from(event.clipboardData?.files ?? []);
    if (!files.length) return;
    event.preventDefault();
    void this.attach(files);
  }

  onPick(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    void this.attach(files);
  }

  async attach(files: File[]) {
    for (const file of files) {
      this.uploading.value++;
      try {
        const part = await ChatApi.Class.upload(file);
        this.attachments.value = [...this.attachments.value, part];
      } finally {
        this.uploading.value--;
      }
    }
  }

  remove(attachment: SessionLog.AttachmentPart) {
    this.attachments.value = this.attachments.value.filter((entry) => entry !== attachment);
    if (attachment.url.startsWith('blob:')) URL.revokeObjectURL(attachment.url);
  }

  async send() {
    if (!this.canSend) return;
    const request = { text: this.draft.value, model: this.modelId.value, attachments: this.attachments.value };
    this.draft.value = '';
    this.attachments.value = [];
    this.inputElement.value?.focus();
    await this.chat.send(request);
  }

  stop() {
    this.chat.stopStreaming();
  }
}

export namespace Composer {
  export const $Class = Static($Composer);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export interface Props {
    chat: Chat.Model;
    kit?: Kit.Entry;
  }
}

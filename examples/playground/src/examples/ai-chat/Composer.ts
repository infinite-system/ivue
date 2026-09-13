import { ref, shallowRef } from 'vue';
import { Reactive } from '../../ivue';
import { Static } from '../../Static';
import { ChatApi } from './ChatApi';
import type { Chat } from './Chat';
import type { Kit } from '../../kit/Kit';
import { KitContainer } from '../../kit/KitContainer';
import { Sidebar } from './sidebar/Sidebar';
import ComposerMenuView from './Composer.Menu.vue';
import { ModelPicker } from './ModelPicker';
import { Icons } from './Icons';
import ChatModelPickerView from './ChatModelPicker.vue';
import type { SessionLog } from './SessionLog';

// The input row: a draft, the picked model, attachments that came in by
// drop, paste or the picker (through the upload mock, never the
// network), and a send that hands the thread one request. Enter sends,
// Shift+Enter breaks a line.
class $Composer extends KitContainer.$Class<Composer.Roles> {
  /** the roles the composer composes — the model picker; built once per class by Static() */
  static override get $kit(): Composer.Roles {
    return {
      Picker: { view: ChatModelPickerView, namespace: ModelPicker },
      Menu: { view: ComposerMenuView }
    };
  }

  static readonly DEFAULT_MODEL = 'default';

  constructor(public props: Composer.Props) {
    super();
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected override get self() {
    return this.constructor as typeof $Composer;
  }

  /** the rail's search glyph, so the two search affordances match */
  get searchIcon(): string {
    return Icons.Class.PATHS.search;
  }

  get moreIcon(): string {
    return Icons.Class.PATHS.more;
  }

  /** the side panels, as the menu lists them on a phone — the rail's own tabs */
  get tabs(): Sidebar.Tab[] {
    return Sidebar.Class.TABS;
  }

  get menuOpen() {
    return ref(false);
  }

  /** a narrow screen: the rail folds into the menu and the placeholder drops its key hint */
  get isCompact(): boolean {
    return (
      typeof window !== 'undefined' && Boolean(window.matchMedia?.('(max-width: 860px)').matches)
    );
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

  get isMenuOpen(): boolean {
    return this.menuOpen.value;
  }

  /** a side panel is open: on a phone the menu button is its close */
  get isPanelOpen(): boolean {
    return this.chat.sidebarTab.value !== null;
  }

  get moreTitle(): string {
    return this.isPanelOpen ? 'Close the panel' : 'Index, files and settings';
  }

  /** a phone has no Enter to explain; the desktop line names both keys */
  get placeholder(): string {
    if (this.chat.isStreaming) return 'The reply is streaming — a replay of a real turn';
    return this.isCompact
      ? 'Type a message, drop an image or a file.'
      : 'Type a message, drop an image or a file. Enter to send, Shift-Enter for line-break.';
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

  iconOf(tab: Sidebar.Tab): string {
    return Icons.Class.PATHS[tab.icon];
  }

  isActive(tab: Sidebar.Tab): boolean {
    return this.chat.sidebarTab.value === tab.id;
  }

  /** the menu, or — while a panel covers the thread on a phone — that panel's close */
  toggleMenu() {
    if (this.isPanelOpen) {
      this.menuOpen.value = false;
      this.chat.toggleSidebar(this.chat.sidebarTab.value!);
      return;
    }
    this.menuOpen.value = !this.menuOpen.value;
  }

  /** open a side panel from the menu, and close the menu */
  pick(tab: Sidebar.Tab) {
    this.menuOpen.value = false;
    this.chat.toggleSidebar(tab.id);
  }

  /* ---- handlers ---- */

  onKeydown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.chat.toggleSearch();
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
    const request = {
      text: this.draft.value,
      model: this.modelId.value,
      attachments: this.attachments.value
    };
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
  /** the roles this class composes — declared, so a view's props and this kit never name each other's inferred types */
  export type Roles = {
    Picker: Kit.Entry<$Composer, undefined, typeof ModelPicker>;
    Menu: Kit.Entry<$Composer>;
  };

  /** what the composer's own leaves receive: their entry and the composer model */
  export interface SectionProps {
    kit: Kit.Entry;
    model: Instance;
  }
  export const $Class = Static($Composer);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;
  // raw-instance type — the picker holds and reads its composer; the raw class, so the kit that names the picker does not cycle
  export type Model = $Composer;

  export type Role = 'Picker' | 'Menu';

  export interface Props {
    chat: Chat.Model;
    kit?: Kit.Entry;
  }
}

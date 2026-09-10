import { Reactive } from 'ivue';
import { Static } from 'ivue/extras';
import { onBeforeUnmount, ref, shallowRef, watch } from 'vue';
import { Editor } from '@tiptap/vue-3';
import { Api } from '../platform/Api';
import { AppStore } from '../app/AppStore';
import { PressEditor } from './PressEditor';

// One markdown editor: a Tiptap document whose value is the markdown
// string the parent owns. Text flows out on every edit as normalized
// markdown and back in only when the parent hands over a text the
// editor did not just emit. Files dropped or pasted upload to the
// press's asset store and land as image or video nodes; a YouTube
// link pasted or typed becomes a player.
class $EditorModel {
  static readonly IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'image/svg+xml'];
  static readonly VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

  constructor(
    public props: EditorModel.Props,
    public emit: EditorModel.Emits,
  ) {
    this.lastMarkdown.value = props.modelValue;
    this.editor.value = this.createEditor();
    watch(
      () => props.modelValue,
      (value) => this.adopt(value),
    );
    watch(
      () => props.readonly,
      (readonly) => this.setReadonly(readonly),
    );
    onBeforeUnmount(() => this.dispose());
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $EditorModel;
  }

  protected get $app() {
    return AppStore.Class.use();
  }

  get editor() {
    return shallowRef<Editor | null>(null);
  }

  /** files still travelling to the store */
  get uploading() {
    return ref(0);
  }

  /** the text this editor last emitted — a parent echoing it back is not a new text */
  get lastMarkdown() {
    return ref('');
  }

  get linkOpen() {
    return ref(false);
  }

  get linkDraft() {
    return ref('');
  }

  get embedOpen() {
    return ref(false);
  }

  get embedDraft() {
    return ref('');
  }

  /* ---- derived ---- */

  get isUploading(): boolean {
    return this.uploading.value > 0;
  }

  get uploadLabel(): string {
    return this.uploading.value === 1 ? 'Uploading 1 file…' : `Uploading ${this.uploading.value} files…`;
  }

  get isEditable(): boolean {
    return !this.props.readonly;
  }

  get minHeight(): string {
    return this.props.minHeight ?? '14rem';
  }

  get acceptedTypes(): string {
    return [...this.self.IMAGE_TYPES, ...this.self.VIDEO_TYPES].join(',');
  }

  get canAddLink(): boolean {
    return this.isEditable && !this.editor.value?.state.selection.empty;
  }

  get linkSubmitLabel(): string {
    return this.linkDraft.value.trim() ? 'Link it' : 'Remove link';
  }

  /* ---- the editor ---- */

  /** the seam a test replaces: everything Tiptap is built here */
  createEditor(): Editor {
    return new Editor({
      extensions: PressEditor.Class.extensions(this.props.placeholder ?? ''),
      content: this.props.modelValue,
      editable: !this.props.readonly,
      editorProps: {
        attributes: { class: 'press-prose', spellcheck: 'true' },
        handleDrop: (_view, event) => this.onDrop(event),
        handlePaste: (_view, event) => this.onPasteFiles(event),
      },
      onUpdate: () => this.onUpdate(),
      onBlur: () => this.emit('save'),
    });
  }

  /** the document as the markdown the press stores */
  markdown(): string {
    const editor = this.editor.value;
    if (!editor) return this.lastMarkdown.value;
    return PressEditor.Class.normalize(String(editor.storage.markdown.getMarkdown()));
  }

  onUpdate() {
    const markdown = this.markdown();
    if (markdown === this.lastMarkdown.value) return;
    this.lastMarkdown.value = markdown;
    this.emit('update:modelValue', markdown);
  }

  /** a text from outside (a load, a restore) replaces the document; our own echo does not */
  adopt(value: string) {
    if (value === this.lastMarkdown.value) return;
    this.lastMarkdown.value = value;
    this.editor.value?.commands.setContent(value, false);
  }

  setReadonly(readonly: boolean | undefined) {
    this.editor.value?.setEditable(!readonly);
  }

  isActive(name: string, attributes?: Record<string, unknown>): boolean {
    return this.editor.value?.isActive(name, attributes) ?? false;
  }

  dispose() {
    this.editor.value?.destroy();
    this.editor.value = null;
  }

  /* ---- toolbar ---- */

  toggleBold() {
    this.editor.value?.chain().focus().toggleBold().run();
  }

  toggleItalic() {
    this.editor.value?.chain().focus().toggleItalic().run();
  }

  toggleHeading(level: 1 | 2 | 3) {
    this.editor.value?.chain().focus().toggleHeading({ level }).run();
  }

  toggleBulletList() {
    this.editor.value?.chain().focus().toggleBulletList().run();
  }

  toggleOrderedList() {
    this.editor.value?.chain().focus().toggleOrderedList().run();
  }

  toggleBlockquote() {
    this.editor.value?.chain().focus().toggleBlockquote().run();
  }

  toggleCode() {
    this.editor.value?.chain().focus().toggleCode().run();
  }

  toggleCodeBlock() {
    this.editor.value?.chain().focus().toggleCodeBlock().run();
  }

  insertRule() {
    this.editor.value?.chain().focus().setHorizontalRule().run();
  }

  openLink() {
    this.linkDraft.value = String(this.editor.value?.getAttributes('link').href ?? '');
    this.linkOpen.value = true;
  }

  submitLink() {
    const href = this.linkDraft.value.trim();
    const chain = this.editor.value?.chain().focus().extendMarkRange('link');
    if (href) chain?.setLink({ href }).run();
    else chain?.unsetLink().run();
    this.linkOpen.value = false;
  }

  closeLink() {
    this.linkOpen.value = false;
  }

  closeEmbed() {
    this.embedOpen.value = false;
  }

  openEmbed() {
    this.embedDraft.value = '';
    this.embedOpen.value = true;
  }

  /** a YouTube link becomes a player, a video file link a <video>, anything else a plain link line */
  submitEmbed() {
    const url = this.embedDraft.value.trim();
    this.embedOpen.value = false;
    if (!url) return;
    this.insertMediaUrl(url);
  }

  insertMediaUrl(url: string) {
    const editor = this.editor.value;
    if (!editor) return;
    if (/^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com|youtu\.be)\//.test(url)) editor.chain().focus().setYoutubeVideo({ src: url }).run();
    else if (/\.(?:mp4|webm|mov)(?:\?.*)?$/i.test(url)) editor.chain().focus().setVideo(url).run();
    else editor.chain().focus().insertContent(`<p>${url}</p>`).run();
  }

  onFilePicked(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    void this.upload(files);
  }

  /* ---- files in ---- */

  /** true claims the event: files we host are uploaded instead of dropped as text */
  onDrop(event: DragEvent): boolean {
    const files = this.hostable(Array.from(event.dataTransfer?.files ?? []));
    if (!files.length) return false;
    event.preventDefault();
    void this.upload(files);
    return true;
  }

  onPasteFiles(event: ClipboardEvent): boolean {
    const files = this.hostable(Array.from(event.clipboardData?.files ?? []));
    if (!files.length) return false;
    event.preventDefault();
    void this.upload(files);
    return true;
  }

  hostable(files: File[]): File[] {
    return files.filter((file) => this.self.IMAGE_TYPES.includes(file.type) || this.self.VIDEO_TYPES.includes(file.type));
  }

  async upload(files: File[]) {
    if (!this.isEditable) return;
    for (const file of this.hostable(files)) {
      this.uploading.value++;
      try {
        const stored = await Api.Class.pressUploadAsset(file);
        this.insertAsset(stored, file);
      } catch (error) {
        this.$app.reportFailure(error);
      } finally {
        this.uploading.value--;
      }
    }
  }

  insertAsset(stored: Api.PressAsset, file: File) {
    const editor = this.editor.value;
    if (!editor) return;
    if (this.self.VIDEO_TYPES.includes(stored.contentType)) editor.chain().focus().setVideo(stored.url).run();
    else editor.chain().focus().setImage({ src: stored.url, alt: file.name.replace(/\.[^.]+$/, '') }).run();
  }
}

export namespace EditorModel {
  export const $Class = Static($EditorModel);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export interface Props {
    modelValue: string;
    readonly?: boolean;
    placeholder?: string;
    minHeight?: string;
  }

  export interface Emits {
    (event: 'update:modelValue', value: string): void;
    (event: 'save'): void;
  }
}

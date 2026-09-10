/*
=== GENERATOR ===
Goal: Prove the editor model is a faithful pipe: every document change leaves as normalized markdown, a parent's echo of that markdown never resets the document, an outside text does, and a dropped file we host uploads and lands as the right node while anything else is left to the editor.
// domain-invariant: $EditorModel — If the parent hands back the text the editor just emitted, then the document is left alone
// domain-invariant: $EditorModel — If a dropped file is an image or video we host, then it uploads and is inserted; otherwise the drop is not claimed
Impossible if true: a file that is not an image or video reaches the asset store from the editor
*/
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Reactive } from 'ivue';
import { EditorModel } from './EditorModel';
import type { Editor } from '@tiptap/vue-3';
import { Api } from '../platform/Api';
import type { AppStore } from '../app/AppStore';

class FakeEditor {
  content = '';
  editable = true;
  destroyed = false;
  inserted: string[] = [];
  chainCalls: string[] = [];
  storage = { markdown: { getMarkdown: () => this.content } };
  state = { selection: { empty: true } };
  commands = {
    setContent: (value: string) => {
      this.content = value;
      return true;
    },
  };
  setEditable(editable: boolean) {
    this.editable = editable;
  }
  isActive(name: string) {
    return name === 'bold';
  }
  getAttributes() {
    return {};
  }
  destroy() {
    this.destroyed = true;
  }
  chain() {
    const record = (name: string) => (argument?: unknown) => {
      this.chainCalls.push(name);
      if (name === 'setImage') this.inserted.push(`image:${(argument as { src: string }).src}`);
      if (name === 'setVideo') this.inserted.push(`video:${argument as string}`);
      if (name === 'setYoutubeVideo') this.inserted.push(`youtube:${(argument as { src: string }).src}`);
      return chain;
    };
    const chain: Record<string, (argument?: unknown) => typeof chain> = new Proxy({}, { get: (_target, name: string) => (name === 'run' ? () => true : record(name)) });
    return chain;
  }
}

const failures: unknown[] = [];

class $Harness extends EditorModel.$Class {
  declare fake: FakeEditor;

  protected get $app() {
    return { reportFailure: (error: unknown) => failures.push(error) } as unknown as AppStore.Instance;
  }

  createEditor() {
    this.fake = new FakeEditor();
    this.fake.content = this.props.modelValue;
    this.fake.editable = !this.props.readonly;
    return this.fake as unknown as Editor;
  }
}

const Harness = Reactive($Harness);

function make(modelValue = 'hello', overrides: Partial<EditorModel.Props> = {}) {
  const emitted: unknown[][] = [];
  const emit = ((...arguments_: unknown[]) => {
    emitted.push(arguments_);
  }) as unknown as EditorModel.Emits;
  const props: EditorModel.Props = { modelValue, ...overrides };
  const model = new Harness(props, emit);
  return { model, emitted, props };
}

function file(name: string, type: string): File {
  return new File(['x'], name, { type });
}

describe('EditorModel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // domain-invariant: $EditorModel — If the parent hands back the text the editor just emitted, then the document is left alone
  it('emits normalized markdown on update, ignores its own echo, and adopts an outside text', () => {
    const { model, emitted } = make('start');
    model.fake.content = 'edited \\* text\\\nline';
    model.onUpdate();
    expect(emitted).toEqual([['update:modelValue', 'edited * text\nline']]);
    const fake = model.fake;
    fake.commands.setContent = vi.fn((value: string) => {
      fake.content = value;
      return true;
    });
    model.adopt('edited * text\nline');
    expect(model.fake.commands.setContent).not.toHaveBeenCalled();
    model.adopt('restored revision');
    expect(model.fake.commands.setContent).toHaveBeenCalledWith('restored revision', false);
    model.onUpdate();
    expect(emitted).toHaveLength(1);
    model.dispose();
    expect(model.fake.destroyed).toBe(true);
    expect(model.markdown()).toBe('restored revision');
  });

  // domain-invariant: $EditorModel — If a dropped file is an image or video we host, then it uploads and is inserted; otherwise the drop is not claimed
  // impossible-if-true: $EditorModel — a file that is not an image or video reaches the asset store from the editor
  it('uploads hosted images and video on drop or paste, inserts the matching node, and leaves other drops alone', async () => {
    const { model } = make();
    const upload = vi.spyOn(Api.Class, 'pressUploadAsset').mockImplementation(async (dropped: File) => ({
      key: `1-${dropped.name}`,
      url: `https://cdn.test/press-asset/1-${dropped.name}`,
      contentType: dropped.type,
      size: 1,
    }));
    const drop = { dataTransfer: { files: [file('a.png', 'image/png'), file('c.mp4', 'video/mp4'), file('n.txt', 'text/plain')] }, preventDefault: vi.fn() } as unknown as DragEvent;
    expect(model.onDrop(drop)).toBe(true);
    expect(drop.preventDefault).toHaveBeenCalled();
    await vi.waitFor(() => expect(model.fake.inserted).toHaveLength(2));
    expect(upload).toHaveBeenCalledTimes(2);
    expect(model.fake.inserted).toEqual(['image:https://cdn.test/press-asset/1-a.png', 'video:https://cdn.test/press-asset/1-c.mp4']);
    expect(model.isUploading).toBe(false);
    const textDrop = { dataTransfer: { files: [file('n.txt', 'text/plain')] }, preventDefault: vi.fn() } as unknown as DragEvent;
    expect(model.onDrop(textDrop)).toBe(false);
    expect(textDrop.preventDefault).not.toHaveBeenCalled();
    const paste = { clipboardData: { files: [file('shot.webp', 'image/webp')] }, preventDefault: vi.fn() } as unknown as ClipboardEvent;
    expect(model.onPasteFiles(paste)).toBe(true);
    await vi.waitFor(() => expect(model.fake.inserted).toHaveLength(3));
    expect(model.onPasteFiles({ clipboardData: { files: [] }, preventDefault: vi.fn() } as unknown as ClipboardEvent)).toBe(false);
  });

  it('routes an embed URL to the player, the video node, or a plain line', () => {
    const { model } = make();
    model.openEmbed();
    expect(model.embedOpen.value).toBe(true);
    model.embedDraft.value = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    model.submitEmbed();
    model.insertMediaUrl('https://cdn.test/press-asset/3-clip.mov');
    model.insertMediaUrl('https://ivue.dev');
    expect(model.fake.inserted).toEqual(['youtube:https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'video:https://cdn.test/press-asset/3-clip.mov']);
    expect(model.fake.chainCalls).toContain('insertContent');
    expect(model.embedOpen.value).toBe(false);
    model.openLink();
    model.linkDraft.value = 'https://ivue.dev/blog';
    expect(model.linkSubmitLabel).toBe('Link it');
    model.submitLink();
    expect(model.fake.chainCalls).toContain('setLink');
    model.openLink();
    model.linkDraft.value = '';
    expect(model.linkSubmitLabel).toBe('Remove link');
    model.submitLink();
    expect(model.fake.chainCalls).toContain('unsetLink');
    model.closeLink();
    model.closeEmbed();
    expect(model.isActive('bold')).toBe(true);
    expect(model.uploadLabel).toBe('Uploading 0 files…');
  });

  it('drives every toolbar verb through the chain, picks files from disk, and reports a failed upload', async () => {
    const { model } = make('x', { minHeight: '30rem' });
    for (const verb of ['toggleBold', 'toggleItalic', 'toggleBulletList', 'toggleOrderedList', 'toggleBlockquote', 'toggleCode', 'toggleCodeBlock', 'insertRule'] as const)
      model[verb]();
    model.toggleHeading(2);
    expect(model.fake.chainCalls).toEqual(
      expect.arrayContaining(['toggleBold', 'toggleItalic', 'toggleBulletList', 'toggleOrderedList', 'toggleBlockquote', 'toggleCode', 'toggleCodeBlock', 'setHorizontalRule', 'toggleHeading']),
    );
    expect(model.minHeight).toBe('30rem');
    expect(model.acceptedTypes).toContain('video/mp4');
    expect(model.canAddLink).toBe(false);
    expect(model.isEditable).toBe(true);
    vi.spyOn(Api.Class, 'pressUploadAsset').mockRejectedValue(new Error('bucket down'));
    const input = { files: [file('a.png', 'image/png')], value: 'C:\\fakepath\\a.png' };
    model.onFilePicked({ target: input } as unknown as Event);
    expect(input.value).toBe('');
    await vi.waitFor(() => expect(failures).toHaveLength(1));
    expect(model.isUploading).toBe(false);
    expect(model.fake.inserted).toEqual([]);
  });

  it('a read-only editor uploads nothing and a disposed editor inserts nothing', async () => {
    const { model } = make('x', { readonly: true });
    expect(model.isEditable).toBe(false);
    expect(model.fake.editable).toBe(false);
    model.setReadonly(false);
    expect(model.fake.editable).toBe(true);
    model.setReadonly(true);
    expect(model.fake.editable).toBe(false);
    const upload = vi.spyOn(Api.Class, 'pressUploadAsset');
    await model.upload([file('a.png', 'image/png')]);
    expect(upload).not.toHaveBeenCalled();
    model.dispose();
    model.insertAsset({ key: 'k', url: 'u', contentType: 'image/png', size: 1 }, file('a.png', 'image/png'));
    model.insertMediaUrl('https://youtu.be/x');
    model.toggleBold();
    expect(model.isActive('bold')).toBe(false);
    expect(model.uploadLabel).toBe('Uploading 0 files…');
  });
});

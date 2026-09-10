// @vitest-environment jsdom
/*
=== GENERATOR ===
Goal: Prove the editor's edges are lossless where the press cares: the markdown subset a body already holds round-trips through a Tiptap document unchanged, a media link alone on its line loads as a player or a video and serializes back to the bare link, and the serializer's escapes never reach the database.
// domain-invariant: $PressEditor — If a body loads and is not edited, then what serializes is the same text
// domain-invariant: $PressEditor — If a line is one media link, then the document holds a player and the text keeps the link
Impossible if true: a stored body carries a backslash the author did not type
*/
import { describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { PressEditor } from './PressEditor';
import { EditorModel } from './EditorModel';
import type { AppStore } from '../app/AppStore';

function load(markdown: string): Editor {
  return new Editor({
    element: document.createElement('div'),
    extensions: PressEditor.Class.extensions('…'),
    content: markdown,
  });
}

function serialized(editor: Editor): string {
  return PressEditor.Class.normalize(String(editor.storage.markdown.getMarkdown()));
}

const BODY = [
  'Every framework bet on classes, then abandoned them.',
  'The bugs were real: snake_case, $Class, a * star and a [code] marker survive.',
  '',
  '---',
  '',
  'Tweet two with https://ivue.dev/blog/introducing-ivue and **bold** and `code`.',
  '',
  '- one',
  '- two',
  '',
  '> quoted',
  '',
  '![banner](https://x.test/a.png)',
  '',
  'After the image.',
  '',
  '```ts',
  'const a = 1;',
  '```',
].join('\n');

describe('PressEditor', () => {
  // domain-invariant: $PressEditor — If a body loads and is not edited, then what serializes is the same text
  it('round-trips the press markdown subset without escapes or backslash breaks', () => {
    const editor = load(BODY);
    expect(serialized(editor)).toBe(BODY);
    editor.destroy();
  });

  // domain-invariant: $PressEditor — If a line is one media link, then the document holds a player and the text keeps the link
  it('loads a YouTube line as a player and a video file line as a video, and writes both back as the bare link', () => {
    const text = 'Watch:\n\nhttps://www.youtube.com/watch?v=dQw4w9WgXcQ\n\nhttps://cdn.test/press-asset/1-clip.mp4\n\nDone.';
    const editor = load(text);
    const html = editor.getHTML();
    expect(html).toContain('data-youtube-video');
    expect(html).toContain('<video');
    expect(serialized(editor)).toBe(text);
    editor.destroy();
  });

  it('inserts a video and a player through their commands and serializes both as links', () => {
    const editor = load('Start.');
    editor.commands.focus('end');
    editor.commands.setVideo('https://cdn.test/press-asset/2-clip.webm');
    editor.commands.focus('start');
    editor.commands.setYoutubeVideo({ src: 'https://youtu.be/dQw4w9WgXcQ' });
    expect(serialized(editor)).toBe('https://youtu.be/dQw4w9WgXcQ\n\nStart.\n\nhttps://cdn.test/press-asset/2-clip.webm');
    editor.destroy();
  });

  // impossible-if-true: $PressEditor — a stored body carries a backslash the author did not type
  it('normalizes what the serializer escapes', () => {
    expect(PressEditor.Class.normalize('a \\* star\\\nnext \\[x\\] \\_y\\_  \n')).toBe('a * star\nnext [x] _y_');
  });

  it('the model builds a real editor: typing emits markdown, a drop of a text file is left to the editor, blur asks to save', () => {
    const emitted: unknown[][] = [];
    const emit = ((...arguments_: unknown[]) => {
      emitted.push(arguments_);
    }) as unknown as EditorModel.Emits;
    const model = new EditorModel.Class({ modelValue: 'Hello', placeholder: 'Say it' }, emit);
    const editor = model.editor.value!;
    expect(model.markdown()).toBe('Hello');
    editor.commands.focus('end');
    editor.commands.insertContent(' world');
    expect(emitted).toEqual([['update:modelValue', 'Hello world']]);
    const view = editor.view;
    const textDrop = { dataTransfer: { files: [new File(['x'], 'n.txt', { type: 'text/plain' })] }, preventDefault: () => {} } as unknown as DragEvent;
    expect(view.props.handleDrop!(view, textDrop, editor.state.doc.slice(0), false)).toBe(false);
    const textPaste = { clipboardData: { files: [] }, preventDefault: () => {} } as unknown as ClipboardEvent;
    expect(view.props.handlePaste!(view, textPaste, editor.state.doc.slice(0))).toBe(false);
    editor.emit('blur', { editor, event: new FocusEvent('blur'), transaction: editor.state.tr });
    expect(emitted.at(-1)).toEqual(['save']);
    expect((model as unknown as { $app: AppStore.Instance }).$app.reportFailure).toBeTypeOf('function');
    model.dispose();
    expect(model.editor.value).toBeNull();
  });
});

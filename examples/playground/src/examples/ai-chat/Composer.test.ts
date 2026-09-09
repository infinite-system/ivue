/*
=== GENERATOR ===
Goal: Prove the composer sends exactly one request with the draft, the picked model and the attachments, only when there is something to send and nothing is streaming; that Enter sends and Shift+Enter does not; and that a dropped, pasted or picked file becomes an attachment through the upload mock and leaves cleanly.
// domain-invariant: $Composer — If the draft is blank and nothing is attached, then send is disabled
// domain-invariant: $Composer — If Enter is pressed without Shift, then the draft is sent and cleared
Impossible if true: a send goes out while a reply is streaming

=== GENERATOR-DESCRIBED ===
$Composer is the input row: draft, model, attachments through the upload mock, one request per send.
*/
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Chat } from './Chat';
import { ChatApi } from './ChatApi';
import { Composer } from './Composer';
import { hosted } from '../virtual-scroller/hosted';

describe('Composer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // domain-invariant: $Composer — If the draft is blank and nothing is attached, then send is disabled
  // domain-invariant: $Composer — If Enter is pressed without Shift, then the draft is sent and cleared
  // impossible-if-true: $Composer — a send goes out while a reply is streaming
  it('sends one request with draft, model and attachments, only when allowed', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    const { instance: chat, unmount } = hosted(() => new Chat.Class());
    const send = vi.spyOn(chat, 'send').mockResolvedValue(undefined);
    const composer = new Composer.Class({ chat });
    expect(composer.canSend).toBe(false);
    expect(composer.sendLabel).toBe('Send');
    composer.draft.value = '  ';
    expect(composer.canSend).toBe(false);
    composer.draft.value = 'hello';
    expect(composer.canSend).toBe(true);
    composer.modelId.value = 'deep';
    expect(composer.model.id).toBe('deep');
    expect(composer.modelHint).toContain('45 tok/s');
    const shiftEnter = { key: 'Enter', shiftKey: true, preventDefault: vi.fn() } as unknown as KeyboardEvent;
    composer.onKeydown(shiftEnter);
    expect(send).not.toHaveBeenCalled();
    expect(shiftEnter.preventDefault).not.toHaveBeenCalled();
    const enter = { key: 'Enter', shiftKey: false, preventDefault: vi.fn() } as unknown as KeyboardEvent;
    composer.onKeydown(enter);
    await Promise.resolve();
    expect(enter.preventDefault).toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith({ text: 'hello', model: 'deep', attachments: [] });
    expect(composer.draft.value).toBe('');
    chat.streaming.value = { controller: new AbortController() } as never;
    composer.draft.value = 'again';
    expect(composer.canSend).toBe(false);
    expect(composer.sendLabel).toBe('Replying…');
    expect(composer.placeholder).toContain('streaming');
    await composer.send();
    expect(send).toHaveBeenCalledTimes(1);
    const stop = vi.spyOn(chat, 'stopStreaming');
    composer.stop();
    expect(stop).toHaveBeenCalled();
    chat.streaming.value = null;
    unmount();
  });

  it('drop, paste and pick attach through the upload mock; remove revokes; upload counts gate the send', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    const { instance: chat, unmount } = hosted(() => new Chat.Class());
    const composer = new Composer.Class({ chat });
    let resolveUpload: ((part: never) => void) | null = null;
    vi.spyOn(ChatApi.Class, 'upload').mockImplementation(
      (file) => new Promise((resolve) => (resolveUpload = resolve as never)).then(() => ({ kind: 'attachment' as const, name: file.name, size: file.size, mimeType: file.type, url: `blob:${file.name}` })),
    );
    const revoke = vi.fn();
    Object.defineProperty(URL, 'revokeObjectURL', { value: revoke, configurable: true, writable: true });
    const image = new File(['xx'], 'a.png', { type: 'image/png' });
    composer.onDrop({ preventDefault() {}, dataTransfer: { files: [image] } } as unknown as DragEvent);
    expect(composer.uploading.value).toBe(1);
    expect(composer.canSend).toBe(false);
    resolveUpload!(undefined as never);
    await Promise.resolve();
    await Promise.resolve();
    expect(composer.attachments.value).toHaveLength(1);
    expect(composer.isImage(composer.attachments.value[0])).toBe(true);
    expect(composer.sizeLabel(composer.attachments.value[0])).toBe('2 B');
    expect(composer.attachmentCountLabel).toBe('1 attachment');
    expect(composer.canSend).toBe(true);
    composer.onPaste({ preventDefault() {}, clipboardData: { files: [] } } as unknown as ClipboardEvent);
    composer.onPaste({ preventDefault() {}, clipboardData: { files: [new File(['y'], 'n.txt', { type: 'text/plain' })] } } as unknown as ClipboardEvent);
    resolveUpload!(undefined as never);
    await Promise.resolve();
    await Promise.resolve();
    const input = { files: [new File(['z'], 'c.md', { type: 'text/markdown' })], value: 'x' };
    composer.onPick({ target: input } as unknown as Event);
    expect(input.value).toBe('');
    resolveUpload!(undefined as never);
    await Promise.resolve();
    await Promise.resolve();
    expect(composer.attachments.value.map((entry) => entry.name)).toEqual(['a.png', 'n.txt', 'c.md']);
    expect(composer.attachmentCountLabel).toBe('3 attachments');
    expect(composer.sizeLabel({ ...composer.attachments.value[0], size: 3 * 1024 })).toBe('3 KB');
    expect(composer.sizeLabel({ ...composer.attachments.value[0], size: 3 * 1024 * 1024 })).toBe('3.0 MB');
    composer.remove(composer.attachments.value[0]);
    expect(revoke).toHaveBeenCalledWith('blob:a.png');
    expect(composer.attachments.value).toHaveLength(2);
    composer.onDragOver({ preventDefault() {} } as DragEvent);
    expect(composer.dragOver.value).toBe(true);
    composer.onDragLeave();
    expect(composer.dragOver.value).toBe(false);
    const send = vi.spyOn(chat, 'send').mockResolvedValue(undefined);
    composer.draft.value = 'with files';
    await composer.send();
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ text: 'with files', attachments: expect.arrayContaining([expect.objectContaining({ name: 'n.txt' })]) }));
    expect(composer.attachments.value).toEqual([]);
    unmount();
  });
});

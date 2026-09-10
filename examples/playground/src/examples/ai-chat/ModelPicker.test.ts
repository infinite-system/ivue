/*
=== GENERATOR ===
Goal: Prove the model picker shows every model of the composer as a card drawn to one scale, that a pick lands on the composer's model id and closes the menu, that the keyboard walks and picks, and that a press outside closes it.
// domain-invariant: $ModelPicker — If a card is picked, then the composer's model id is that model's and the menu is closed
Impossible if true: a bar wider than the fastest model's

=== GENERATOR-DESCRIBED ===
$ModelPicker owns the menu only; the picked id is the composer's ref.
*/
import { describe, expect, it, vi } from 'vitest';
import { Chat } from './Chat';
import { Composer } from './Composer';
import { ModelPicker } from './ModelPicker';
import { hosted } from '../virtual-scroller/hosted';

describe('ModelPicker', () => {
  // domain-invariant: $ModelPicker — If a card is picked, then the composer's model id is that model's and the menu is closed
  // impossible-if-true: $ModelPicker — a bar wider than the fastest model's
  it('lists the composer models to one scale, picks by click and keyboard, and closes on an outside press', () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    const host = hosted(() => new Chat.Class());
    const composer = new Composer.Class({ chat: host.instance });
    const picker = hosted(() => new ModelPicker.Class({ composer })).instance;
    expect(picker.models).toBe(composer.models);
    expect(picker.pickedLabel).toBe('Balanced');
    const widths = picker.models.map((model) => Number.parseInt(picker.speedStyle(model).width, 10));
    expect(Math.max(...widths)).toBe(100);
    expect(widths.every((width) => width > 0 && width <= 100)).toBe(true);
    expect(picker.waitStyle(picker.models[2]).width).toBe('100%');
    expect(picker.iconFor(picker.models[0])).toBe(ModelPicker.$Class.ICONS.quick);
    expect(picker.iconFor({ ...picker.models[0], id: 'other' })).toBe(ModelPicker.$Class.DOT);

    picker.toggle();
    expect(picker.open.value).toBe(true);
    expect(picker.isUnderCursor(picker.models[1])).toBe(true);
    picker.pick(picker.models[2]);
    expect(composer.modelId.value).toBe('deep');
    expect(picker.open.value).toBe(false);
    expect(picker.isPicked(picker.models[2])).toBe(true);
    expect(picker.cardClass(picker.models[2])['ac-picked']).toBe(true);

    const key = (name: string) => picker.onKeydown({ key: name, preventDefault: () => undefined } as KeyboardEvent);
    key('ArrowUp'); // opens on the picked card, then steps up
    expect(picker.open.value).toBe(true);
    expect(picker.cursor.value).toBe(1);
    key('ArrowUp');
    key('ArrowUp'); // wraps
    expect(picker.cursor.value).toBe(2);
    key('ArrowDown');
    key('Enter');
    expect(composer.modelId.value).toBe('quick');
    expect(picker.open.value).toBe(false);
    key('Escape');
    expect(picker.open.value).toBe(false);

    picker.show();
    const inside = {} as Node;
    picker.rootElement.value = { contains: (node: Node) => node === inside } as unknown as HTMLElement;
    picker.onDocumentPointerDown({ target: inside } as unknown as PointerEvent);
    expect(picker.open.value).toBe(true);
    picker.onDocumentPointerDown({ target: {} } as unknown as PointerEvent);
    expect(picker.open.value).toBe(false);
    host.unmount();
    vi.restoreAllMocks();
  });
});

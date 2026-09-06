/*
=== GENERATOR ===
Goal: Drive the demo's million-row list from a few shared strings and a speed slider, so the page stays memory-sane and every control is a name on the class.
// domain-invariant: $VirtualScrollerExample — If the rows are built, then every body is one of twenty-four shared strings, the id is the index and the position is one-based.
// domain-invariant: $VirtualScrollerExample — If a row's text is asked, then it is the same string the template renders: the locale position, a dash, the body.
// domain-invariant: $VirtualScrollerExample — If the speed slider reads px per second, then the creep knob reads ms per px with a floor of one px per second.
// domain-invariant: $VirtualScrollerExample — If a control fires, then it delegates to the scroller's exposed instance: jump with a 12 px top offset, play from zero delay, pause.
Impossible if true: A million unique body strings.

=== GENERATOR-DESCRIBED ===
The million-row count is a static, so a subclass overrides it to a
thousand for the spec: the same class, a smaller list. The scroller is
a plain object standing in for the template ref — the controls are
delegations, and the double records where they land.
*/

import { ref } from 'vue';
import { expect, test, vi } from 'vitest';
import { Reactive } from '../../ivue';
import { Static } from '../../Static';
import { VirtualScrollerExample } from './VirtualScrollerExample';

class $Small extends VirtualScrollerExample.$Class {
  static override readonly ITEM_COUNT = 1000;
}

namespace Small {
  export const $Class = Static($Small);
  export let Class = Reactive($Class);
}

// domain-invariant: $VirtualScrollerExample — If the rows are built, then every body is one of twenty-four shared strings, the id is the index and the position is one-based.
// impossible-if-true: $VirtualScrollerExample — A million unique body strings.
test('a thousand rows share twenty-four body strings, with index ids and one-based positions', () => {
  const example = new Small.Class();
  const items = example.items.value as VirtualScrollerExample.Row[];
  expect(items).toHaveLength(1000);
  expect(new Set(items.map((row) => row.body)).size).toBe(24);
  expect(items[0]).toMatchObject({ id: '0', position: '1' });
  expect(items[999]).toMatchObject({ id: '999', position: '1000' });
  expect(example.itemCount).toBe(1000);
  expect(example.itemCountLabel).toBe((1000).toLocaleString());
});

// domain-invariant: $VirtualScrollerExample — If a row's text is asked, then it is the same string the template renders: the locale position, a dash, the body.
test('a row’s copy text is the locale position, a dash, and the body', () => {
  const example = new Small.Class();
  const row = {
    id: '1233',
    position: '1234',
    body: 'The window walks.'
  } as VirtualScrollerExample.Row;
  expect(example.rowText(row)).toBe(`#${(1234).toLocaleString()} — The window walks.`);
});

// domain-invariant: $VirtualScrollerExample — If the speed slider reads px per second, then the creep knob reads ms per px with a floor of one px per second.
test('the speed slider’s px per second becomes the creep’s ms per px, floored at one px per second', () => {
  const example = new Small.Class();
  expect(example.speed.value).toBe(6.7);
  expect(example.creepMsPerPx).toBeCloseTo(1000 / 6.7, 6);
  example.speed.value = 50;
  expect(example.creepMsPerPx).toBe(20);
  expect(example.speedLabel).toBe('50.0 px/s');
  example.speed.value = 0;
  expect(example.creepMsPerPx).toBe(1000);
});

// domain-invariant: $VirtualScrollerExample — If a control fires, then it delegates to the scroller's exposed instance: jump with a 12 px top offset, play from zero delay, pause.
test('jump, play and pause delegate to the scroller’s exposed instance, and the labels follow its autoplay state', () => {
  const example = new Small.Class();
  const isAutoPlaying = ref(false);
  const scroller = {
    scrollToIndex: vi.fn(),
    startAutoPlay: vi.fn(() => (isAutoPlaying.value = true)),
    stopAutoPlay: vi.fn(() => (isAutoPlaying.value = false)),
    get isAutoPlaying() {
      return isAutoPlaying.value;
    },
    visibleItems: [1, 2, 3],
    selection: { selectedRowCount: 4 }
  };
  example.scroller.value = scroller as unknown as typeof example.scroller.value;

  expect(example.renderedCount).toBe(3);
  expect(example.selectedRowCount).toBe(4);
  expect(example.playButtonLabel).toBe('autoplay');
  example.toggleAutoPlay();
  expect(scroller.startAutoPlay).toHaveBeenCalledWith(0);
  expect(example.playButtonLabel).toBe('pause');
  expect(example.playButtonIcon).toBe('⏸');
  example.toggleAutoPlay();
  expect(scroller.stopAutoPlay).toHaveBeenCalled();

  example.jumpTo(500);
  expect(scroller.scrollToIndex).toHaveBeenLastCalledWith(500, undefined, true, 12);
  example.jumpToEnd();
  expect(scroller.scrollToIndex).toHaveBeenLastCalledWith(999, undefined, true, 12);
});

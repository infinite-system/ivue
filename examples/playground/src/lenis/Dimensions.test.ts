/*
=== GENERATOR ===
Goal: Know the wrapper's size and the content's scroll size, and their difference as the limit, re-measured on resize.
[A finger's swipe becomes the glide it meant, on every phone](lenis.invariants.md#a-fingers-swipe-becomes-the-glide-it-meant-on-every-phone)
// domain-invariant: $Dimensions — If the wrapper is an element, then width and height are its client size and the scroll sizes are its scroll sizes, the limit is scroll size minus size on each axis, and a resize re-reads them.
Impossible if true: A limit that does not move when the content grows.

=== GENERATOR-DESCRIBED ===
Upstream Lenis's Dimensions, ported with the handlers as prototype
methods bound in the constructor; the virtual scroller bypasses the
limit through lenis.virtualLimit, so this spec pins the measured path.
*/

import { expect, test, vi } from 'vitest';
import { Dimensions } from './Dimensions';

function sized(
  wrapper: HTMLElement,
  content: HTMLElement,
  size: { client: number; scroll: number }
) {
  for (const [name, value] of [
    ['clientWidth', size.client],
    ['clientHeight', size.client],
    ['scrollWidth', size.scroll],
    ['scrollHeight', size.scroll]
  ] as const) {
    Object.defineProperty(wrapper, name, { value, configurable: true });
    Object.defineProperty(content, name, { value, configurable: true });
  }
}

// domain-invariant: $Dimensions — If the wrapper is an element, then width and height are its client size and the scroll sizes are its scroll sizes, the limit is scroll size minus size on each axis, and a resize re-reads them.
// invariant: A finger's swipe becomes the glide it meant, on every phone (examples/playground/src/lenis/lenis.invariants.md)
test('an element wrapper measures its client and scroll sizes, the limit is their difference, and resize re-reads', () => {
  const wrapper = document.createElement('div');
  const content = document.createElement('div');
  sized(wrapper, content, { client: 400, scroll: 1000 });
  const dimensions = new Dimensions.Class(wrapper, content, { autoResize: false });
  expect(dimensions.width).toBe(400);
  expect(dimensions.scrollHeight).toBe(1000);
  expect(dimensions.limit).toEqual({ x: 600, y: 600 });
  sized(wrapper, content, { client: 400, scroll: 1600 });
  expect(dimensions.limit.y).toBe(600);
  dimensions.resize();
  expect(dimensions.limit).toEqual({ x: 1200, y: 1200 });
  dimensions.destroy();
});

// impossible-if-true: $Dimensions — A limit that does not move when the content grows.
test('the handlers are prototype methods bound once: a subclass override wins and the bound one is what resize calls', () => {
  class $Probe extends Dimensions.$Class {
    override onContentResize() {
      this.scrollHeight = 9999;
      this.scrollWidth = 9999;
    }
  }
  const wrapper = document.createElement('div');
  const content = document.createElement('div');
  sized(wrapper, content, { client: 400, scroll: 1000 });
  // The bind happens in the constructor, so a spy must sit on the
  // prototype BEFORE construction to see the bound handler's calls.
  const spy = vi.spyOn($Probe.prototype, 'onWrapperResize');
  const probe = new $Probe(wrapper, content, { autoResize: false });
  expect(probe.limit.y).toBe(9999 - 400);
  expect(spy).toHaveBeenCalledTimes(1);
  const detached = probe.resize;
  detached();
  expect(spy).toHaveBeenCalledTimes(2);
  spy.mockRestore();
});

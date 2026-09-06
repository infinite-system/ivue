/*
=== GENERATOR ===
Goal: Glide a whole book as one scrolling line by composing the chunker and the horizontal scroller, with the speed a live setting and the chunk widths true before the first frame.
[The marquee composes the scroller and never extends it](text-marquee.invariants.md#the-marquee-composes-the-scroller-and-never-extends-it)
[Chunk widths are seeded exact before any chunk renders](text-marquee.invariants.md#chunk-widths-are-seeded-exact-before-any-chunk-renders)
[Speed rides the creep integrator](text-marquee.invariants.md#speed-rides-the-creep-integrator)
[The assumed chunk size never falls below the minimum](text-marquee.invariants.md#the-assumed-chunk-size-never-falls-below-the-minimum)
// domain-invariant: $TextMarquee — If the props object is read, then the defaults are 50 px per second and 400 characters a chunk, and the text is required.
// domain-invariant: $TextMarquee — If the text or the target changes, then the items are rebuilt as one-lined chunks with index ids and one-based positions.
// domain-invariant: $TextMarquee — If play, pause or toggle fires, then it delegates to the scroller's exposed autoplay.
Impossible if true: A chunk width the scroller assumes that is smaller than the minimum.

=== GENERATOR-DESCRIBED ===
The marquee is hosted (hosted.ts) because measureFont runs on mount.
The scroller it composes is a plain object of the three members the
marquee calls, so the seeding is observed as calls, not as pixels. The
canvas is stubbed to eight px a character, which makes every expected
width arithmetic.
*/

import { nextTick, reactive } from 'vue';
import { afterEach, expect, test, vi } from 'vitest';
import { TextChunker } from './TextChunker';
import { TextMarquee } from './TextMarquee';
import { hosted } from '../virtual-scroller/hosted';

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

function stubCanvas() {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    measureText: (text: string) => ({ width: text.length * 8 }),
    font: ''
  } as unknown as CanvasRenderingContext2D);
}

function marquee(text: string, overrides: Partial<TextMarquee.Props> = {}) {
  // jsdom logs a not-implemented error for every getContext; a null
  // context is the honest "no canvas" and the chunker's fallback path.
  if (!vi.isMockFunction(HTMLCanvasElement.prototype.getContext)) {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  }
  const props = reactive({
    ...TextMarquee.Class.propsDefaults,
    text,
    ...overrides
  }) as TextMarquee.Props;
  const scroller = {
    syncItemSize: vi.fn(),
    updatePositionsImmediately: vi.fn(),
    startAutoPlay: vi.fn(),
    stopAutoPlay: vi.fn(),
    isAutoPlaying: false,
    visibleItems: [] as unknown[],
    selection: { selectedRowCount: 0 }
  };
  const root = document.createElement('div');
  document.body.appendChild(root);
  const host = hosted(() => {
    const instance = new TextMarquee.Class(props);
    instance.rootElement.value = root;
    instance.scroller.value = scroller as unknown as typeof instance.scroller.value;
    return instance;
  });
  return { ...host, props, scroller };
}

// domain-invariant: $TextMarquee — If the props object is read, then the defaults are 50 px per second and 400 characters a chunk, and the text is required.
test('the props object carries the two defaults and requires the text', () => {
  const props = TextMarquee.Class.props;
  expect(props.pxPerSecond).toMatchObject({ default: 50 });
  expect(props.targetChars).toMatchObject({ default: 400 });
  expect(props.text).toMatchObject({ required: true });
});

// domain-invariant: $TextMarquee — If the text or the target changes, then the items are rebuilt as one-lined chunks with index ids and one-based positions.
test('the items are the one-lined text in chunks, rebuilt when the text changes', async () => {
  const { instance, props, unmount } = marquee('alpha beta\n\ngamma delta epsilon', {
    targetChars: 10
  });
  const bodies = instance.items.value.map((item) => item.body);
  expect(bodies.join('')).toBe('alpha beta gamma delta epsilon');
  expect(bodies).toEqual(TextChunker.Class.chunk('alpha beta gamma delta epsilon', 10));
  expect(instance.items.value[0]).toMatchObject({ id: '0', position: '1' });
  expect(instance.chunkCount).toBe(bodies.length);

  props.text = 'one two';
  await nextTick();
  expect(instance.items.value.map((item) => item.body).join('')).toBe('one two');
  unmount();
});

// invariant: Chunk widths are seeded exact before any chunk renders (examples/playground/src/examples/text-marquee/text-marquee.invariants.md)
test('on mount the real font is measured and every chunk width is seeded into the scroller, then positions are repaired once', () => {
  stubCanvas();
  const { instance, scroller, unmount } = marquee('alpha beta gamma delta', { targetChars: 10 });
  const chunks = instance.items.value.map((item) => item.body);
  expect(scroller.syncItemSize.mock.calls).toEqual(
    chunks.map((chunk, index) => [index, chunk.length * 8, false])
  );
  expect(scroller.updatePositionsImmediately).toHaveBeenCalledTimes(1);
  expect(instance.averageCharWidth.value).toBe(8);
  unmount();
});

// invariant: The assumed chunk size never falls below the minimum (examples/playground/src/examples/text-marquee/text-marquee.invariants.md)
// impossible-if-true: $TextMarquee — A chunk width the scroller assumes that is smaller than the minimum.
test('the assumed chunk size is the target times the average character width, never below the minimum', () => {
  const wide = marquee('text', { targetChars: 400 });
  // The average is whatever the font measured to — cached once per font
  // across the process, so it is read, not assumed.
  const average = wide.instance.averageCharWidth.value;
  expect(average).toBeGreaterThan(0);
  expect(wide.instance.assumedChunkSize).toBe(Math.round(400 * average));
  wide.unmount();
  const narrow = marquee('text', { targetChars: 2 });
  expect(narrow.instance.assumedChunkSize).toBe(TextMarquee.Class.minimumChunkWidth);
  narrow.unmount();
});

// invariant: Speed rides the creep integrator (examples/playground/src/examples/text-marquee/text-marquee.invariants.md)
test('px per second becomes the creep’s ms per px, floored at one px per second', () => {
  const { instance, props, unmount } = marquee('text');
  expect(instance.creepMsPerPx).toBe(20);
  props.pxPerSecond = 200;
  expect(instance.creepMsPerPx).toBe(5);
  props.pxPerSecond = 0;
  expect(instance.creepMsPerPx).toBe(1000);
  unmount();
});

// domain-invariant: $TextMarquee — If play, pause or toggle fires, then it delegates to the scroller's exposed autoplay.
// invariant: The marquee composes the scroller and never extends it (examples/playground/src/examples/text-marquee/text-marquee.invariants.md)
test('play, pause and toggle delegate to the scroller’s autoplay through the exposed instance', () => {
  const { instance, scroller, unmount } = marquee('text');
  instance.play();
  expect(scroller.startAutoPlay).toHaveBeenCalledWith(0);
  instance.pause();
  expect(scroller.stopAutoPlay).toHaveBeenCalledTimes(1);
  instance.togglePlay();
  expect(scroller.startAutoPlay).toHaveBeenCalledTimes(2);
  scroller.isAutoPlaying = true;
  instance.togglePlay();
  expect(scroller.stopAutoPlay).toHaveBeenCalledTimes(2);
  expect(instance.isPlaying).toBe(true);
  unmount();
});

/*
=== GENERATOR ===
Goal: Turn any text into whitespace-safe chunks a virtual scroller can treat as items, with widths the scroller can trust before a chunk has rendered.
[Chunks concatenate back to the source text byte for byte](text-marquee.invariants.md#chunks-concatenate-back-to-the-source-text-byte-for-byte)
[Chunk widths are seeded exact before any chunk renders](text-marquee.invariants.md#chunk-widths-are-seeded-exact-before-any-chunk-renders)
// domain-invariant: $TextChunker — If whitespace runs are collapsed, then a whole text is one line with single spaces and no ends.
// domain-invariant: $TextChunker — If a word is longer than the target, then the chunk extends to the next space rather than splitting the word.
// domain-invariant: $TextChunker — If no canvas is available, then widths fall back to a typical UI-font average and the average character width is that same number.
Impossible if true: A chunk boundary inside a word.

=== GENERATOR-DESCRIBED ===
The chunker is a pure Static class: every spec is a function of its
arguments. jsdom ships no canvas, so the two measurement paths are
both proven — the fallback against the real jsdom, the exact path
against a stubbed 2d context whose measureText is eight px a character.
*/

import { afterEach, expect, test, vi } from 'vitest';
import { TextChunker } from './TextChunker';

const Chunker = TextChunker.Class;

const prose =
  'The window walks; the list stands still. A million rows, a handful of divs — ' +
  'estimates decide the spacers, real sizes decide the rest. '.repeat(20);

afterEach(() => {
  vi.restoreAllMocks();
});

// domain-invariant: $TextChunker — If whitespace runs are collapsed, then a whole text is one line with single spaces and no ends.
test('oneLine collapses every whitespace run into a single space and trims the ends', () => {
  expect(Chunker.oneLine('  a\n\n b\t\tc  \r\n')).toBe('a b c');
  expect(Chunker.oneLine('')).toBe('');
});

// invariant: Chunks concatenate back to the source text byte for byte (examples/playground/src/examples/text-marquee/text-marquee.invariants.md)
// impossible-if-true: $TextChunker — A chunk boundary inside a word.
test('chunks join back to the source byte for byte, cut only at spaces, each keeping its trailing space', () => {
  const text = Chunker.oneLine(prose);
  for (const target of [1, 7, 40, 400, 10_000]) {
    const chunks = Chunker.chunk(text, target);
    expect(chunks.join('')).toBe(text);
    for (const chunk of chunks.slice(0, -1)) {
      expect(chunk.endsWith(' ')).toBe(true);
      expect(chunk.trimEnd()).not.toMatch(/\s$/);
    }
    // No boundary inside a word: the character after every cut starts a word.
    let cursor = 0;
    for (const chunk of chunks.slice(0, -1)) {
      cursor += chunk.length;
      expect(text[cursor - 1]).toBe(' ');
      expect(text[cursor]).not.toBe(' ');
    }
  }
  expect(Chunker.chunk('', 10)).toEqual([]);
});

// domain-invariant: $TextChunker — If a word is longer than the target, then the chunk extends to the next space rather than splitting the word.
test('a word longer than the target stays whole — the chunk extends to the next space', () => {
  const text = 'a supercalifragilisticexpialidocious word';
  expect(Chunker.chunk(text, 5)).toEqual(['a ', 'supercalifragilisticexpialidocious ', 'word']);
  expect(Chunker.chunk('onlyoneword', 3)).toEqual(['onlyoneword']);
  // A target below one behaves as one.
  expect(Chunker.chunk('ab cd', 0)).toEqual(['ab ', 'cd']);
});

// domain-invariant: $TextChunker — If no canvas is available, then widths fall back to a typical UI-font average and the average character width is that same number.
test('without a canvas the widths fall back to 7.5 px a character', () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  const chunks = ['abcd ', 'ef'];
  expect(Chunker.measureChunks(chunks, '16px sans-serif')).toEqual([37.5, 15]);
  expect(Chunker.averageCharWidth('16px sans-serif')).toBe(7.5);
});

// invariant: Chunk widths are seeded exact before any chunk renders (examples/playground/src/examples/text-marquee/text-marquee.invariants.md)
test('with a canvas every chunk is measured exactly, and the average character width is measured once per font', () => {
  const measureText = vi.fn((text: string) => ({ width: text.length * 8 }));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    measureText,
    font: ''
  } as unknown as CanvasRenderingContext2D);
  expect(Chunker.measureChunks(['abcd ', 'ef'], '20px serif')).toEqual([40, 16]);
  const first = Chunker.averageCharWidth('20px serif');
  expect(first).toBe(8);
  const calls = measureText.mock.calls.length;
  expect(Chunker.averageCharWidth('20px serif')).toBe(8);
  expect(measureText.mock.calls.length).toBe(calls);
});

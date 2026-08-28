/**
 * Pure text machinery — it knows NOTHING about scrolling. It turns any
 * text into whitespace-safe chunks a virtual scroller can treat as items,
 * and estimates chunk pixel widths with a canvas so the scroller's
 * assumed size starts near the truth. Keeping this separate is what keeps
 * the scroller pure: the scroller speaks items, sizes and pixels; the
 * chunker speaks text — TextMarquee is the only place the two meet.
 *
 * Stateless by design — every member is static, so the namespace
 * publishes the plain form (no `Reactive()`: there is nothing reactive
 * to transform).
 */
class $TextChunker {
  /** Collapse every whitespace run (newlines, tabs, double spaces) into a
   *  single space — a whole book becomes ONE line. */
  static oneLine(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  /**
   * Slice `text` into chunks of roughly `targetChars` characters, cutting
   * ONLY at spaces so a word never splits across two items. Every chunk
   * keeps its trailing space, so the chunks concatenate back
   * byte-identically to the source — rendered side by side with
   * `white-space: pre`, the joints are invisible.
   */
  static chunk(text: string, targetChars: number): string[] {
    const chunks: string[] = [];
    const length = text.length;
    let start = 0;
    while (start < length) {
      let end = Math.min(start + Math.max(1, targetChars), length);
      if (end < length) {
        const breakAt = text.lastIndexOf(' ', end - 1);
        if (breakAt > start) {
          end = breakAt + 1; // the space stays with the LEFT chunk
        } else {
          // No space inside the window (one giant word) — extend to the
          // next space so the word stays whole.
          const forward = text.indexOf(' ', end);
          end = forward === -1 ? length : forward + 1;
        }
      }
      chunks.push(text.slice(start, end));
      start = end;
    }
    return chunks;
  }

  /** Prose sample the canvas measures — mixed case, punctuation and
   *  spaces in ordinary proportions, so the average is honest for text. */
  private static readonly WIDTH_SAMPLE =
    'The window walks; the list stands still. A million rows, ' +
    'a handful of divs — estimates decide the spacers, real sizes decide the rest.';

  private static readonly widthCache = new Map<string, number>();

  /**
   * Canvas-measured average character width for a CSS `font` shorthand,
   * cached per font. This seeds the scroller's assumed chunk size:
   * `targetChars × averageCharWidth` lands within a few percent of the
   * real chunk width, so the scroll extent and the seek mapping are
   * honest before a single chunk has been measured for real.
   */
  static averageCharWidth(font: string): number {
    const cached = $TextChunker.widthCache.get(font);
    if (cached !== undefined) return cached;
    // SSR / test environments without a DOM fall back to a typical
    // UI-font average; the first client-side call refines it.
    if (typeof document === 'undefined') return 7.5;
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return 7.5;
    context.font = font;
    const sample = $TextChunker.WIDTH_SAMPLE;
    const width = context.measureText(sample).width / sample.length;
    $TextChunker.widthCache.set(font, width);
    return width;
  }

  /**
   * EXACT pixel width of every chunk under a CSS `font` — one canvas,
   * one measureText per chunk (microseconds each; a whole book measures
   * in single-digit milliseconds). Average-based estimates run ~1% small
   * per chunk, which compounds across a thousand chunks into a hidden
   * tail at the end of the scroll; exact seeds make the scroll extent,
   * the seek mapping and the END of the text true before any chunk has
   * rendered.
   */
  static measureChunks(chunks: string[], font: string): number[] {
    const fallback = () => chunks.map((chunk) => chunk.length * 7.5);
    if (typeof document === 'undefined') return fallback();
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return fallback();
    context.font = font;
    return chunks.map((chunk) => context.measureText(chunk).width);
  }
}

export namespace TextChunker {
  export const $Class = $TextChunker; // raw — children `extends` this
  export let Class = $Class; // plain form — a pure static utility
}

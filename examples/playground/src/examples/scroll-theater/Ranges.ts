// Ranges.ts — the primitive every layer of a theater is a formatter over. A
// range is a stretch of the list from one row to another, resolved to px
// through the owner's anchored positions (the assumed row height before
// geometry knows); a row is a range one row long, a chapter a range of rows,
// a choreography any range between two anchors. Three derivations, all pure
// functions of the scroll value: PROGRESS across the range, PRESENCE of the
// range in the APERTURE (the region of the frame the text is seen through,
// with a focus line), and STEP, progress quantised and held. Nothing here
// runs, observes, or touches the DOM: a range is inert geometry, which is
// why any number of them animate at once without blocking.
import { Static } from '../../Static';

class $Ranges {
  /** The fraction of the aperture over which a range's presence rises and
   *  falls: in as the span's leading edge crosses that much of the aperture,
   *  out from the moment the next row enters. */
  static readonly FADE_FRACTION: number = 0.6;

  /** The whole frame, the focus line two fifths down it. */
  static readonly WHOLE_FRAME: Ranges.Aperture = { top: 0, bottom: 1, focus: 0.4 };

  constructor(public owner: Ranges.Owner) {}

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $Ranges;
  }

  /** Spans resolved in this batch, keyed by the range; cleared by `beginBatch`. */
  protected readonly spans = new Map<string, Ranges.Span>();

  // DERIVED
  /** The aperture's span along the scroll, in px, at a scroll value. */
  get apertureHeight(): number {
    const { top, bottom } = this.owner.aperture;
    return Math.max(1, this.owner.frameSpan * (bottom - top));
  }

  // RANGES
  row(index: number): Ranges.Range {
    return { from: index, to: index + 1 };
  }

  rows(from: number, to: number): Ranges.Range {
    return { from, to: Math.max(from + 1, to) };
  }

  /** Between two named anchors: the row the first names to the row the
   *  second names, or to the list's end when the second is unknown. */
  between(fromAnchor: string, toAnchor: string): Ranges.Range | null {
    const from = this.owner.anchors.get(fromAnchor);
    if (from === undefined) return null;
    const to = this.owner.anchors.get(toAnchor) ?? this.owner.rowCount;
    return this.rows(from, to);
  }

  // SPANS
  /** Where a row's top sits: anchored when geometry knows, assumed before. */
  positionOf(index: number): number {
    return this.owner.anchoredPosition(index) ?? index * this.owner.assumedRowPx;
  }

  /** A range's span in px, memoised for the batch. */
  // invariant: A range is inert geometry over the list (examples/playground/src/examples/scroll-theater/scroll-theater.invariants.md)
  spanOf(range: Ranges.Range): Ranges.Span {
    const key = `${range.from}:${range.to}`;
    const known = this.spans.get(key);
    if (known) return known;
    const start = this.positionOf(range.from);
    const span = { start, end: Math.max(start + 1, this.positionOf(range.to)) };
    this.spans.set(key, span);
    return span;
  }

  /** A batch of formatting begins: geometry may have moved since the last. */
  beginBatch() {
    this.spans.clear();
  }

  // DERIVATIONS
  /** 0 at the range's start, 1 at its end, held outside. */
  // invariant: Progress is the fraction of a range crossed and held past its edges (examples/playground/src/examples/scroll-theater/scroll-theater.invariants.md)
  progressOf(range: Ranges.Range, value: number): number {
    const span = this.spanOf(range);
    return Math.min(1, Math.max(0, (value - span.start) / (span.end - span.start)));
  }

  /** How much of the aperture the range owns, over the smaller of the two
   *  heights: the overlap of span and aperture divided by the lesser of the
   *  span's height and the aperture's, so a span taller than the aperture
   *  is fully present once it fills the aperture and a row shorter than it
   *  is fully present once it is wholly inside; the last FADE_FRACTION of
   *  that coverage is the fade, in and out. For a tall span this is the
   *  interlude's curve: 0 until the span has entered most of the aperture,
   *  1 while it alone is in it, falling from the moment the next row enters. */
  // invariant: Presence is coverage of the aperture over the smaller height (examples/playground/src/examples/scroll-theater/scroll-theater.invariants.md)
  presenceOf(range: Ranges.Range, value: number): number {
    const span = this.spanOf(range);
    const { top, bottom } = this.owner.aperture;
    const frame = this.owner.frameSpan;
    const apertureStart = value + frame * top;
    const apertureEnd = value + frame * bottom;
    const overlap = Math.min(span.end, apertureEnd) - Math.max(span.start, apertureStart);
    if (overlap <= 0) return 0;
    const covered = overlap / Math.min(span.end - span.start, this.apertureHeight);
    const fade = this.self.FADE_FRACTION;
    return Math.min(1, Math.max(0, (covered - (1 - fade)) / fade));
  }

  /** The span's centre against the focus line: -1 a half-aperture below
   *  it, 0 on it, 1 a half-aperture above, clamped. */
  focusOf(range: Ranges.Range, value: number): number {
    const span = this.spanOf(range);
    const { top, bottom, focus } = this.owner.aperture;
    const line = value + this.owner.frameSpan * (top + (bottom - top) * focus);
    const centre = (span.start + span.end) / 2;
    return Math.min(1, Math.max(-1, (line - centre) / (this.apertureHeight / 2)));
  }

  /** Progress quantised to `steps` held states: 0 … steps - 1. */
  stepOf(range: Ranges.Range, value: number, steps: number): number {
    return Math.min(steps - 1, Math.floor(this.progressOf(range, value) * steps));
  }
}

export namespace Ranges {
  export const $Class = Static($Ranges); // anchor — it declares statics
  export let Class = $Class; // plain — no instance reactivity: a range is geometry
  export type Model = InstanceType<typeof Class>;

  /** What a range needs from the list it lies in. */
  export interface Owner {
    readonly rowCount: number;
    /** px, when geometry knows the row; undefined before */
    anchoredPosition(index: number): number | undefined;
    readonly assumedRowPx: number;
    /** the frame's height along the scroll */
    readonly frameSpan: number;
    readonly aperture: Aperture;
    /** named rows: an anchor's key to its row index */
    readonly anchors: ReadonlyMap<string, number>;
  }

  /** Rows `from` (inclusive) to `to` (exclusive); a row is `{i, i + 1}`. */
  export interface Range {
    from: number;
    to: number;
  }

  /** A range resolved to px along the scroll. */
  export interface Span {
    start: number;
    end: number;
  }

  /** The region of the frame the text is seen through, as fractions of the
   *  frame's height from its top, and the focus line as a fraction of the
   *  aperture's own height. */
  export interface Aperture {
    top: number;
    bottom: number;
    focus: number;
  }
}

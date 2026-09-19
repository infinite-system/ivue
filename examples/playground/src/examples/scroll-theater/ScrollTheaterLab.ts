// ScrollTheaterLab.ts — the theater's test bench: a page where each primitive
// is exercised live as it lands. Commit 1: RANGES — three ranges over a
// plain list (a row, a chapter, an anchor pair), the aperture drawn over the
// frame and narrowed by sliders, and the three derivations read out on
// every frame the layer moves. Nothing here is a scene; it is the
// instrument the scenes will be built with.
import { ref, watch } from 'vue';
import { Reactive } from '../../ivue';
import { Static } from '../../Static';
import { Ranges } from './Ranges';
import type { VirtualScroller } from '../virtual-scroller/VirtualScroller';

class $ScrollTheaterLab {
  static readonly ITEM_COUNT: number = 200;
  static readonly ASSUMED_ROW_PX: number = 56;
  /** The ranges on the bench: a row, a chapter, and rows between two anchors. */
  static readonly ROW_INDEX: number = 20;
  static readonly CHAPTER: Ranges.Range = { from: 40, to: 60 };
  static readonly ANCHORS: ReadonlyMap<string, number> = new Map([
    ['a', 80],
    ['b', 110]
  ]);
  static readonly STEPS: number = 4;

  static buildItems(): ScrollTheaterLab.Row[] {
    return Array.from({ length: this.ITEM_COUNT }, (_row, index) => ({
      id: String(index),
      position: String(index + 1),
      body: `Row ${index}`
    }));
  }

  constructor() {
    watch(
      () => this.scroller.value,
      () => this.onScrollerChange()
    );
  }

  protected get self() {
    return this.constructor as typeof $ScrollTheaterLab;
  }

  protected readonly geometry = { ranges: null as Ranges.Model | null };

  // STATE
  get items() {
    return ref<ScrollTheaterLab.Row[]>(this.self.buildItems());
  }

  get position() {
    return ref(0);
  }

  /** The aperture's edges and focus line, as the sliders set them. */
  get apertureTop() {
    return ref(0);
  }

  get apertureBottom() {
    return ref(100);
  }

  get apertureFocus() {
    return ref(40);
  }

  // ELEMENT REFS
  get scroller() {
    return ref<VirtualScroller.Exposed<ScrollTheaterLab.Row> | null>(null);
  }

  // DERIVED — the ranges owner
  protected get ranges(): Ranges.Model {
    return (this.geometry.ranges ??= new Ranges.Class(this));
  }

  get rowCount(): number {
    return this.items.value.length;
  }

  get assumedRowPx(): number {
    return this.self.ASSUMED_ROW_PX;
  }

  get frameSpan(): number {
    return this.scroller.value?.containerSpan ?? 1;
  }

  get aperture(): Ranges.Aperture {
    return {
      top: this.apertureTop.value / 100,
      bottom: Math.max(this.apertureTop.value + 5, this.apertureBottom.value) / 100,
      focus: this.apertureFocus.value / 100
    };
  }

  get anchors(): ReadonlyMap<string, number> {
    return this.self.ANCHORS;
  }

  // DERIVED — the bench
  get benchRanges(): ScrollTheaterLab.Bench[] {
    const ranges = this.ranges;
    const pair = ranges.between('a', 'b') ?? ranges.rows(80, 110);
    return [
      { key: 'row', label: `row ${this.self.ROW_INDEX}`, range: ranges.row(this.self.ROW_INDEX) },
      { key: 'chapter', label: 'chapter 40–60', range: this.self.CHAPTER },
      { key: 'anchors', label: 'anchors a→b', range: pair }
    ];
  }

  /** The three derivations of each bench range at the current position. */
  get readouts(): ScrollTheaterLab.Readout[] {
    const ranges = this.ranges;
    const value = this.position.value;
    ranges.beginBatch();
    return this.benchRanges.map(({ key, label, range }) => ({
      key,
      label,
      progress: ranges.progressOf(range, value).toFixed(3),
      presence: ranges.presenceOf(range, value).toFixed(3),
      step: String(ranges.stepOf(range, value, this.self.STEPS)),
      focus: ranges.focusOf(range, value).toFixed(2)
    }));
  }

  /** The aperture drawn over the frame: the two curtains' heights and the focus line's top. */
  get curtainTopStyle(): Record<string, string> {
    return { height: `${this.apertureTop.value}%` };
  }

  get curtainBottomStyle(): Record<string, string> {
    return { height: `${100 - this.apertureBottom.value}%` };
  }

  get focusLineStyle(): Record<string, string> {
    const { top, bottom, focus } = this.aperture;
    return { top: `${(top + (bottom - top) * focus) * 100}%` };
  }

  get positionLabel(): string {
    return `${Math.round(this.position.value).toLocaleString()} px`;
  }

  /** Which bench range a row belongs to, for the highlight. */
  benchOf(index: number): string {
    for (const bench of this.benchRanges) if (index >= bench.range.from && index < bench.range.to) return bench.key;
    return '';
  }

  // METHODS
  /** A row's anchored position, for the ranges owner. */
  anchoredPosition(index: number): number | undefined {
    return this.scroller.value?.getAnchoredPosition(index);
  }

  onScrollerChange() {
    const lenis = this.scroller.value?.lenis;
    if (!lenis) return;
    lenis.on('scroll', () => this.onScroll(lenis.animatedScroll));
    this.onScroll(lenis.animatedScroll);
  }

  onScroll(rendered: number) {
    this.position.value = rendered;
  }
}

export namespace ScrollTheaterLab {
  export const $Class = Static($ScrollTheaterLab);
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export interface Row extends VirtualScroller.BaseItem {
    body: string;
  }

  export interface Bench {
    key: string;
    label: string;
    range: Ranges.Range;
  }

  export interface Readout {
    key: string;
    label: string;
    progress: string;
    presence: string;
    step: string;
    focus: string;
  }
}

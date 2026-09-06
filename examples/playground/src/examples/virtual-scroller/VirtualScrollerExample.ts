import { ref, shallowRef, watch } from 'vue';
import { Reactive } from '../../ivue';
import { Static } from '../../Static';
import type { VirtualScroller } from './VirtualScroller';

class $VirtualScrollerExample {
  /** Typed as a number, not the literal, so a test double can shrink the list. */
  static readonly ITEM_COUNT: number = 1_000_000;

  protected static readonly OPENERS = [
    'Everything costs proportional to what is observed',
    'The window walks; the list stands still',
    'A million rows, a handful of divs',
    'Estimates decide the spacers; real heights decide the rest',
    'Scroll is virtual — the DOM never learns the total',
    'Heights are captured once, on the way in and on the way out'
  ];

  /** A million rows must stay memory-sane: bodies are 24 SHARED string
   *  variants — unique text per row would be hundreds of MB of strings.
   *  Built once per receiver. */
  protected static get $bodyVariants(): string[] {
    return this.buildBodyVariants();
  }

  /** Builds the 24 body variants — the `$bodyVariants` cache calls this once per receiver. */
  protected static buildBodyVariants(): string[] {
    const variants: string[] = [];
    for (let openerIndex = 0; openerIndex < this.OPENERS.length; openerIndex++) {
      for (let extraSentences = 0; extraSentences < 4; extraSentences++) {
        let body = `${this.OPENERS[openerIndex]}.`;
        for (let extra = 0; extra < extraSentences; extra++) {
          body +=
            ' Rendered rows are normal-flow blocks between two spacer divs, so the browser stacks them at their real heights for free.';
        }
        variants.push(body);
      }
    }
    return variants;
  }

  static buildItems(): VirtualScrollerExample.Row[] {
    const variants = this.$bodyVariants;
    const items = new Array(this.ITEM_COUNT);
    for (let index = 0; index < this.ITEM_COUNT; index++) {
      items[index] = {
        id: String(index),
        body: variants[(index * 7) % variants.length],
        position: String(index + 1)
      };
    }
    return items;
  }

  /** On-device diagnostics: `?touchdebug` in the URL turns the demo into
   *  an instrument that logs every selection call and touch event on the
   *  page itself — the only way to read what a phone does. */
  constructor() {
    watch(
      () => this.scroller.value,
      () => this.attachTouchDebug()
    );
  }

  // MUTABLE STATE — the list is replaced wholesale, never deep-mutated,
  // so shallowRef keeps a million rows out of the deep-proxy machinery.
  get items() {
    return shallowRef<VirtualScroller.BaseItem[]>(this.self.buildItems());
  }

  // MUTABLE STATE — the autoplay-speed slider writes this (px/s; 6.7 is
  // the scroller's tuned reading cadence, 150 ms per px).
  get speed() {
    return ref(6.7);
  }

  // TEMPLATE-REF TARGET — the scroller component's exposed instance.
  get scroller() {
    return ref<VirtualScroller.Exposed<VirtualScroller.BaseItem> | null>(null);
  }

  // DERIVED — plain getter; reactive through the scroller's exposed state.
  get renderedCount() {
    return this.scroller.value?.visibleItems.length ?? 0;
  }

  // DERIVED — the slider's px/s translated into the creep integrator's unit.
  get creepMsPerPx() {
    return 1000 / Math.max(1, this.speed.value);
  }

  get speedLabel() {
    return `${this.speed.value.toFixed(1)} px/s`;
  }

  // DERIVED — reads the scroller's reactive autoplay state through expose.
  get isAutoPlaying() {
    return this.scroller.value?.isAutoPlaying ?? false;
  }

  get playButtonIcon() {
    return this.isAutoPlaying ? '⏸' : '▶';
  }

  get selectedRowCount() {
    return this.scroller.value?.selection.selectedRowCount ?? 0;
  }

  get selectedRowsLabel() {
    return this.selectedRowCount.toLocaleString();
  }

  // MUTABLE STATE — the diagnostic log, newest last, capped.
  get touchLog() {
    return shallowRef<string[]>([]);
  }

  get touchDebugEnabled() {
    return typeof location !== 'undefined' && /touchdebug/.test(location.search);
  }

  get touchLogText() {
    return this.touchLog.value.join('\n');
  }

  get playButtonLabel() {
    return this.isAutoPlaying ? 'pause' : 'autoplay';
  }

  /** The tip line under the controls — its own row, so toggling never shifts the buttons. */
  get autoPlayHint() {
    return this.isAutoPlaying
      ? 'autoplay on — scroll up to stop, or press pause'
      : 'autoplay off — press ▶ to glide through the list';
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $VirtualScrollerExample;
  }

  get itemCount() {
    return this.self.ITEM_COUNT;
  }

  get itemCountLabel() {
    return this.itemCount.toLocaleString();
  }

  /** The row's text as the template renders it — what an unmounted row
   *  contributes to a copied selection (mounted rows read their own DOM). */
  rowText(item: VirtualScroller.BaseItem) {
    const row = item as VirtualScrollerExample.Row;
    return `#${Number(row.position).toLocaleString()} — ${row.body}`;
  }

  /** Append a diagnostic line (wall clock in seconds). */
  logTouch(line: string) {
    const stamp = (performance.now() / 1000).toFixed(2);
    this.touchLog.value = [...this.touchLog.value.slice(-39), `${stamp}s ${line}`];
  }

  /**
   * Wrap the selection's entry points and the frame's touch events with
   * logging. Wrapped methods land as own properties on the raw instance,
   * which is what the gesture and the frame loops read through — every
   * call and every thrown error shows up, in order.
   */
  attachTouchDebug() {
    const scroller = this.scroller.value;
    if (!scroller || !this.touchDebugEnabled) return;
    const selection = scroller.selection as unknown as Record<
      string,
      (...args: unknown[]) => unknown
    >;
    const wrap = (name: string, summary: (args: unknown[], result: unknown) => string) => {
      const original = selection[name];
      if (typeof original !== 'function') return;
      selection[name] = (...args: unknown[]) => {
        try {
          const result = original(...args);
          this.logTouch(`${name} ${summary(args, result)}`);
          return result;
        } catch (error) {
          this.logTouch(`ERR ${name}: ${(error as Error).message}`);
          throw error;
        }
      };
    };
    const point = (args: unknown[]) =>
      `(${Math.round(args[0] as number)},${Math.round(args[1] as number)})`;
    wrap('beginAt', (args, result) => `${point(args)} ${args[2] ?? 'mouse'} → ${result}`);
    wrap(
      'extendTo',
      (args) => `${point(args)} rows=${scroller.selection.selectedRowCount} ${dom()}`
    );
    wrap('endDrag', () => `rows=${scroller.selection.selectedRowCount}`);
    const dom = () => {
      const mounted =
        scroller.itemsWrapperElement?.querySelectorAll('.virtual-scroller__item') ?? [];
      const last = mounted[mounted.length - 1];
      const tail = last
        ? ` last#${last.getAttribute('aria-rowindex')} text=${(last.textContent ?? '').trim().length}`
        : '';
      return `walk=${scroller.visibleIndex.start}..${scroller.visibleIndex.end} dom=${mounted.length}${tail} pos=${Math.round(Number(scroller.scrollPosition))}`;
    };
    wrap('autoscrollStep', () => `rows=${scroller.selection.selectedRowCount} ${dom()}`);
    wrap('clear', () => '');
    wrap(
      'onSelectionChange',
      () =>
        `native=${getSelection()?.toString().length ?? 0} rows=${scroller.selection.selectedRowCount}`
    );
    const frame = scroller.scrollElement;
    for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel'] as const) {
      frame?.addEventListener(
        type,
        (event) => {
          const touch = (event as TouchEvent).touches[0];
          this.logTouch(
            `${type}${touch ? ` (${Math.round(touch.clientX)},${Math.round(touch.clientY)})` : ''} cancelable=${event.cancelable} prevented=${event.defaultPrevented}`
          );
        },
        { capture: true, passive: true }
      );
    }
    window.addEventListener('error', (event) => this.logTouch(`window error: ${event.message}`));
    this.logTouch(
      `touch debug on — Highlight API: ${typeof CSS !== 'undefined' && 'highlights' in CSS}`
    );
  }

  jumpTo(index: number) {
    this.scroller.value?.scrollToIndex(index, undefined, true, 12);
  }

  toggleAutoPlay() {
    const scroller = this.scroller.value;
    if (!scroller) return;
    if (this.isAutoPlaying) {
      scroller.stopAutoPlay();
    } else {
      scroller.startAutoPlay(0);
    }
  }

  jumpToEnd() {
    this.jumpTo(this.itemCount - 1);
  }
}

export namespace VirtualScrollerExample {
  /* Identity */

  export const $Class = Static($VirtualScrollerExample); // anchor — it declares statics; children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop

  /** A row of the demo list: the base item plus the text the row renders. */
  export interface Row extends VirtualScroller.BaseItem {
    body: string;
    position: string;
  }
}

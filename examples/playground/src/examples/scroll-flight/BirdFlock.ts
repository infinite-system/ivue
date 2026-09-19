// BirdFlock.ts — the controller of a flock: decides WHERE the painter runs
// and carries what a worker cannot read. When the canvas can be handed to a
// worker (an OffscreenCanvas), the painter runs there on its own frame loop
// — a main-thread stall never reaches the birds, and drawing them never
// costs the main thread; otherwise the painter runs here, as it always did.
// Either way the stage moves the canvas as one composed track and startles
// it with a tap; this class only measures the layout and relays.
import { onUnmounted, ref, shallowRef } from 'vue';
import { Reactive } from '../../ivue';
import { Static } from '../../Static';
import { BirdFlockPainter } from './BirdFlockPainter';

class $BirdFlock {
  /** Whether this browser can hand a canvas to a worker. */
  static get canOffload(): boolean {
    return (
      typeof Worker === 'function' &&
      typeof HTMLCanvasElement !== 'undefined' &&
      typeof HTMLCanvasElement.prototype.transferControlToOffscreen === 'function'
    );
  }

  /** The worker entry, as a module the bundler resolves. */
  static createWorker(): Worker {
    return new Worker(new URL('./bird-flock.worker.ts', import.meta.url), { type: 'module' });
  }

  constructor(public canvas: HTMLCanvasElement) {
    // the canvas's size follows the layout; the painter is told in device pixels
    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(() => this.onResize());
      observer.observe(canvas);
      onUnmounted(() => observer.disconnect());
    }
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $BirdFlock;
  }

  // STATE
  /** Whether the flock runs, wherever it runs. */
  get running() {
    return ref(false);
  }

  /** The worker holding the painter, when the canvas was handed over. */
  protected get worker() {
    return shallowRef<Worker | null>(null);
  }

  /** The painter, when it runs in this thread. */
  protected get painter() {
    return shallowRef<BirdFlockPainter.Model | null>(null);
  }

  // DERIVED
  /** The canvas's size in device pixels, from its layout. */
  get deviceSize(): { width: number; height: number } {
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    return { width: this.canvas.clientWidth * dpr, height: this.canvas.clientHeight * dpr };
  }

  // METHODS
  start() {
    if (this.running.value) return;
    const size = this.deviceSize;
    if (this.self.canOffload) {
      const worker = this.self.createWorker();
      const offscreen = this.canvas.transferControlToOffscreen();
      worker.postMessage({ type: 'start', canvas: offscreen, ...size }, [offscreen]);
      this.worker.value = worker;
      this.running.value = true;
      return;
    }
    const painter = new BirdFlockPainter.Class(this.canvas);
    painter.resize(size.width, size.height);
    this.painter.value = painter;
    this.running.value = painter.start();
  }

  stop() {
    this.running.value = false;
    const worker = this.worker.value;
    if (worker) {
      worker.postMessage({ type: 'stop' });
      worker.terminate();
      this.worker.value = null;
    }
    this.painter.value?.stop();
    this.painter.value = null;
  }

  onResize() {
    if (!this.running.value) return;
    const size = this.deviceSize;
    if (this.worker.value) this.worker.value.postMessage({ type: 'resize', ...size });
    else this.painter.value?.resize(size.width, size.height);
  }

  /** A touch or a click at a page point: mapped into the canvas's unit
   *  square here, where the layout is, and relayed. */
  startleAt(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const unitX = (clientX - rect.left) / rect.width;
    const unitY = (clientY - rect.top) / rect.height;
    if (this.worker.value) this.worker.value.postMessage({ type: 'startle', unitX, unitY });
    else this.painter.value?.startleAt(unitX, unitY);
  }
}

export namespace BirdFlock {
  export const $Class = Static($BirdFlock); // anchor — it declares statics
  export let Class = Reactive($Class);
  export type Model = InstanceType<typeof Class>;
  export type Instance = typeof Class.Instance;

  /** What the controller tells the worker. */
  export type Message =
    | { type: 'start'; canvas: OffscreenCanvas; width: number; height: number }
    | { type: 'resize'; width: number; height: number }
    | { type: 'startle'; unitX: number; unitY: number }
    | { type: 'stop' };
}

/*
=== GENERATOR ===
Goal: The flock's painter runs where the canvas can be held without costing the main thread — a worker with an OffscreenCanvas when the browser can hand one over, the main thread otherwise — and the controller carries only what a worker cannot read: the layout's size and where a tap landed.
// domain-invariant: $BirdFlock — If the browser can hand a canvas to a worker, then the painter runs there: the canvas is transferred once, the worker is told the size in device pixels on start and on every resize, a tap as a point in the canvas's unit square, and stop; otherwise the painter runs in this thread with the same size and points.
Impossible if true: A flock drawn on the main thread in a browser that can hand its canvas to a worker.
Impossible if true: A worker asked to measure a layout.

=== GENERATOR-DESCRIBED ===
The controller is specified with a fake worker that records what it is
told, and a canvas stub that can be handed over; the fallback with neither.
*/

import { afterEach, expect, test, vi } from 'vitest';
import { BirdFlock } from './BirdFlock';

afterEach(() => {
  vi.unstubAllGlobals();
});

// domain-invariant: $BirdFlock — If the browser can hand a canvas to a worker, then the painter runs there: the canvas is transferred once, the worker is told the size in device pixels on start and on every resize, a tap as a point in the canvas's unit square, and stop; otherwise the painter runs in this thread with the same size and points.
// impossible-if-true: $BirdFlock — A flock drawn on the main thread in a browser that can hand its canvas to a worker.
// impossible-if-true: $BirdFlock — A worker asked to measure a layout.
test('with a worker at hand the canvas is handed over once and the worker is told size, taps and stop — never asked to measure', () => {
  const posted: Array<{ message: Record<string, unknown>; transfer: unknown[] | undefined }> = [];
  let terminated = 0;
  class FakeWorker {
    postMessage(message: Record<string, unknown>, transfer?: unknown[]) {
      posted.push({ message, transfer });
    }
    terminate() {
      terminated++;
    }
  }
  vi.stubGlobal('Worker', FakeWorker);
  const offscreen = { width: 0, height: 0 } as unknown as OffscreenCanvas;
  let transfers = 0;
  const canvas = document.createElement('canvas');
  Object.defineProperty(canvas, 'clientWidth', { value: 300 });
  Object.defineProperty(canvas, 'clientHeight', { value: 200 });
  canvas.getBoundingClientRect = () => ({ left: 100, top: 50, width: 300, height: 200 }) as DOMRect;
  (canvas as unknown as { transferControlToOffscreen: () => OffscreenCanvas }).transferControlToOffscreen = () => {
    transfers++;
    return offscreen;
  };
  vi.stubGlobal('HTMLCanvasElement', { prototype: { transferControlToOffscreen: () => offscreen } });
  vi.spyOn(BirdFlock.$Class, 'createWorker').mockImplementation(() => new FakeWorker() as unknown as Worker);
  Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true });

  const flock = new BirdFlock.Class(canvas);
  flock.start();
  expect(transfers).toBe(1);
  expect(flock.running.value).toBe(true);
  expect(posted[0]).toEqual({ message: { type: 'start', canvas: offscreen, width: 600, height: 400 }, transfer: [offscreen] });
  // a second start hands nothing over again
  flock.start();
  expect(transfers).toBe(1);
  // a tap at the canvas's centre-right: a point in its unit square, mapped here
  flock.startleAt(100 + 225, 50 + 100);
  expect(posted[1].message).toEqual({ type: 'startle', unitX: 0.75, unitY: 0.5 });
  // a resize: device pixels again
  flock.onResize();
  expect(posted[2].message).toEqual({ type: 'resize', width: 600, height: 400 });
  flock.stop();
  expect(posted[3].message).toEqual({ type: 'stop' });
  expect(terminated).toBe(1);
  expect(flock.running.value).toBe(false);
});

test('without a worker the painter runs in this thread — and with no WebGL, as in this test, the flock does not run', () => {
  vi.stubGlobal('Worker', undefined);
  const canvas = document.createElement('canvas');
  const flock = new BirdFlock.Class(canvas);
  expect(BirdFlock.$Class.canOffload).toBe(false);
  flock.start();
  expect(flock.running.value).toBe(false); // jsdom has no WebGL: the painter's setup declines
  flock.stop();
});

// bird-flock.worker.ts — the worker entry: one painter on the canvas it is
// handed, driven by the controller's messages. The loop is the worker's own.
import { BirdFlockPainter } from './BirdFlockPainter';
import type { BirdFlock } from './BirdFlock';

let painter: BirdFlockPainter.Model | null = null;

self.onmessage = (event: MessageEvent<BirdFlock.Message>) => {
  const message = event.data;
  switch (message.type) {
    case 'start':
      painter = new BirdFlockPainter.Class(message.canvas);
      painter.resize(message.width, message.height);
      painter.start();
      break;
    case 'resize':
      painter?.resize(message.width, message.height);
      break;
    case 'startle':
      painter?.startleAt(message.unitX, message.unitY);
      break;
    case 'stop':
      painter?.stop();
      painter = null;
      break;
  }
};

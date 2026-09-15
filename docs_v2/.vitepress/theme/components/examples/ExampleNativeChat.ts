import { Reactive } from '../../../../../examples/playground/src/ivue';
import { Static } from '../../../../../examples/playground/src/Static';

/**
 * The control, not an example: the same shape of conversation in a plain
 * `overflow-y: auto` box, so the scroller above it can be judged against the
 * browser's own scrolling on the very device doing the judging. Nothing here
 * is virtualized, nothing is transformed — the browser scrolls it, and the
 * only question worth asking of the two is which one feels like the phone.
 *
 * The rows are generated rather than fetched so the comparison carries no
 * network, and generated DETERMINISTICALLY so the server's render and the
 * client's agree: a seeded LCG, not Math.random.
 */
class $ExampleNativeChat {
  /** How many messages the box holds — enough to flick through, few enough
   *  that a browser is happy laying all of them out at once. */
  static get COUNT() {
    return 320;
  }

  /** The sentences the bodies are built from — the real thread's register,
   *  so the rows measure like the rows above them. */
  static get SENTENCES(): readonly string[] {
    return [
      'The window walk is anchored at the target while the transform lerps toward it.',
      'Rows measure only once they mount, so every position before that is an estimate.',
      'A flick sets its target once and the decay carries it the rest of the way.',
      'That reads as chop on a phone, and only on a phone.',
      'The pad holds its level through the decay so nothing unmounts mid-glide.',
      'Speed crosses the seam in px per millisecond, never per animation frame.',
      'It settles within half a pixel and then snaps, which is what ends the loop.',
      'The leading spacer carries everything above the window, as one number.',
      'Measured on a throttled profile, the same gesture twice, medians reported.',
      'The browser stacks the window at real sizes for free, so no top is computed.'
    ];
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $ExampleNativeChat;
  }

  /** The conversation, built once. */
  get rows(): ExampleNativeChat.Row[] {
    const self = this.self;
    const random = this.seeded(20260915);
    const sentences = self.SENTENCES;
    const out: ExampleNativeChat.Row[] = [];
    for (let index = 0; index < self.COUNT; index++) {
      const lines = 1 + Math.floor(random() * 4);
      const body: string[] = [];
      for (let line = 0; line < lines; line++)
        body.push(sentences[Math.floor(random() * sentences.length)]);
      out.push({
        id: String(index),
        number: index + 1,
        mine: random() < 0.38,
        body: body.join(' '),
        code: random() < 0.18 ? 'const pad = this.padding.pad();' : null,
        minutes: 12 + Math.floor(index / 6)
      });
    }
    return out;
  }

  /** A deterministic stream — the same rows on the server and in the browser. */
  protected seeded(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  /** The clock label a row shows — the same shape the thread above uses. */
  stamp(row: ExampleNativeChat.Row): string {
    const hour = 9 + Math.floor(row.minutes / 60);
    const minute = row.minutes % 60;
    return `${hour}:${String(minute).padStart(2, '0')}`;
  }

  who(row: ExampleNativeChat.Row): string {
    return row.mine ? 'You' : 'Agent';
  }

  /** The letter in the avatar — named, because a template carries no logic. */
  initial(row: ExampleNativeChat.Row): string {
    return row.mine ? 'Y' : 'A';
  }
}

export namespace ExampleNativeChat {
  export const $Class = Static($ExampleNativeChat); // anchor — it declares statics
  export let Class = Reactive($Class);
  export type Instance = typeof Class.Instance;

  export interface Row {
    id: string;
    number: number;
    mine: boolean;
    body: string;
    code: string | null;
    minutes: number;
  }
}

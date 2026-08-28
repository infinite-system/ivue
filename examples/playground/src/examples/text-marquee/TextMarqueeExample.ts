import { ref } from 'vue';

import { Reactive } from '../../ivue';
import type { TextMarquee } from './TextMarquee';

const SENTENCES = [
  'The window walks; the list stands still.',
  'Everything costs proportional to what is observed, and nothing ever costs the total.',
  'Estimates decide the spacers; real sizes decide the rest.',
  'Rendered chunks are normal-flow elements between two spacer divs, so the browser lays the line out at its real widths for free.',
  'Scroll is virtual — the DOM never learns how long the book is.',
  'Widths are captured once, on the way in and on the way out of the window.',
  'The prefix sum is never materialized; a movable cursor walks it lazily.',
  'Past two to the twenty-third pixels, single-precision compositing loses the sub-pixel — so the origin rebases and the content always renders at small coordinates.',
  'Speed is a setting; the tuned cadence is the default.',
  'The chunker speaks text, the scroller speaks pixels, and the marquee is where they meet.',
];

/** A book-scale text, assembled once at module load: 200 chapters of the
 *  same prose bank (one shared string in memory, ~400k characters). The
 *  marquee one-lines it — newlines and all — into a single scrolling line. */
function buildBook(): string {
  const chapters: string[] = [];
  for (let chapter = 1; chapter <= 200; chapter++) {
    const paragraphs: string[] = [`Chapter ${chapter}.`];
    for (let paragraph = 0; paragraph < 3; paragraph++) {
      const sentences: string[] = [];
      for (let sentence = 0; sentence < 8; sentence++) {
        sentences.push(
          SENTENCES[(chapter * 5 + paragraph * 3 + sentence) % SENTENCES.length]
        );
      }
      paragraphs.push(sentences.join(' '));
    }
    chapters.push(paragraphs.join('\n\n'));
  }
  return chapters.join('\n\n\n');
}

export const BOOK_TEXT = buildBook();

class $TextMarqueeExample {
  // MUTABLE STATE — the slider writes this; the marquee reads it as a prop.
  get speed() {
    return ref(120);
  }

  // TEMPLATE-REF TARGET — the marquee component's exposed instance.
  get marquee() {
    return ref<TextMarquee.Exposed | null>(null);
  }

  /* DERIVED — plain getters; reactive through the marquee's exposed state. */

  get chunkCount() {
    return this.marquee.value?.chunkCount ?? 0;
  }

  get renderedCount() {
    return this.marquee.value?.renderedCount ?? 0;
  }

  get isPlaying() {
    return this.marquee.value?.isPlaying ?? false;
  }

  get playButtonIcon() {
    return this.isPlaying ? '⏸' : '▶';
  }

  get playButtonLabel() {
    return this.isPlaying ? 'gliding — scroll back to stop' : 'glide';
  }

  get statsLabel() {
    return (
      `${BOOK_TEXT.length.toLocaleString()} characters · ` +
      `${this.chunkCount.toLocaleString()} chunks · ` +
      `${this.renderedCount} in the DOM`
    );
  }

  get speedLabel() {
    return `${this.speed.value} px/s`;
  }

  togglePlay() {
    this.marquee.value?.togglePlay();
  }
}

export namespace TextMarqueeExample {
  export const $Class = $TextMarqueeExample; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}

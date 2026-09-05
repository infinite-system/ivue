// ChannelNote.ts — the banner for channel posts (private HN/X/… artifacts,
// dev server only): names the destination platform and, for X threads,
// annotates every segment with its character count — the one figure that
// matters when previewing a thread.
import { nextTick, onMounted, watch } from 'vue';
import { useData } from 'vitepress';
import { Reactive } from '../../../../lib/Reactive';
import { Static } from '../../../../lib/Static';

class $ChannelNote {
  static get CHANNEL_NAMES(): Record<string, string> {
    return {
      hn: 'Hacker News',
      reddit: 'Reddit',
      x: 'X thread',
      linkedin: 'LinkedIn',
      note: 'Planning note',
    };
  }

  static get X_LIMIT() {
    return 280;
  }

  constructor() {
    const { frontmatter, page } = useData();
    this.frontmatter = frontmatter;
    this.page = page;
    onMounted(() => this.annotateThreadSegments());
    watch(
      () => this.page.value.relativePath,
      () => this.scheduleAnnotate(),
    );
  }

  protected readonly frontmatter: ReturnType<typeof useData>['frontmatter'];
  protected readonly page: ReturnType<typeof useData>['page'];

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $ChannelNote;
  }

  // DERIVED — plain getters
  get channel(): string | null {
    return this.frontmatter.value.channel ?? null;
  }
  get hasChannel() {
    return !!this.channel;
  }
  get channelName() {
    const channel = this.channel;
    return channel ? this.self.CHANNEL_NAMES[channel] ?? channel : '';
  }
  get isThread() {
    return this.channel === 'x';
  }

  // METHODS
  scheduleAnnotate() {
    nextTick(() => this.annotateThreadSegments());
  }

  annotateThreadSegments() {
    if (!this.isThread) return;
    const documentBody = document.querySelector('.vp-doc > div');
    if (!documentBody || documentBody.querySelector('.x-segment-count')) return;
    let characters = 0;
    let segmentNumber = 1;
    for (const child of [...documentBody.children]) {
      if (child.tagName === 'HR') {
        this.insertCount(documentBody, child, characters, segmentNumber);
        segmentNumber += 1;
        characters = 0;
      } else if (child.tagName !== 'H1') {
        characters += (child.textContent ?? '').trim().length;
      }
    }
    this.insertCount(documentBody, null, characters, segmentNumber);
  }

  insertCount(documentBody: Element, anchor: Element | null, characters: number, segmentNumber: number) {
    if (characters === 0) return;
    const limit = this.self.X_LIMIT;
    const label = document.createElement('div');
    label.className = 'x-segment-count' + (characters > limit ? ' x-segment-count--over' : '');
    label.textContent =
      `tweet ${segmentNumber} · ${characters} chars` +
      (characters > limit ? ` — ${characters - limit} over the limit` : '');
    documentBody.insertBefore(label, anchor);
  }
}

export namespace ChannelNote {
  export const $Class = Static($ChannelNote); // anchor — it declares statics; children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}

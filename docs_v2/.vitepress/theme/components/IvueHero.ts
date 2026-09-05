// IvueHero.ts — the landing hero's model: hosts the live counter and the
// typewriter headline, and owns the watch line that reports the counter's
// changes. Same engine as the whole page.
import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue';
import { Reactive } from '../../../../lib/Reactive';
import { HeroCounter } from './HeroCounter';
import { HeroTypewriter } from './HeroTypewriter';

class $IvueHero {
  constructor() {
    onMounted(() => this.start());
    onUnmounted(() => this.dispose());
  }

  // HOSTED models — created on first touch, held for the life of the hero
  protected get $counter() {
    return new HeroCounter.Class();
  }

  protected get $typewriter() {
    return new HeroTypewriter.Class();
  }

  /** The counter, exposed for the template's dotted reads. */
  get counter() {
    return this.$counter;
  }

  // FORWARDED cells
  get count(): Ref<number> {
    return this.$counter.count;
  }

  get finaleText(): Ref<string> {
    return this.$typewriter.finaleText;
  }

  // MUTABLE STATE — the watch line
  get lastChange() {
    return ref('');
  }

  get fired() {
    return ref(0);
  }

  // ACTIONS
  /** The watch registers on mount, in the component's scope — reaped on unmount. */
  start() {
    watch(
      () => this.count.value,
      (newCount, oldCount) => this.recordChange(newCount, oldCount),
    );
    this.$typewriter.start();
  }

  recordChange(newCount: number, oldCount: number) {
    this.lastChange.value = `${oldCount} → ${newCount}`;
    this.fired.value++;
  }

  dispose() {
    this.$typewriter.stop();
    this.$typewriter.$stopEffects();
    this.$counter.$stopEffects();
  }
}

export namespace IvueHero {
  export const $Class = $IvueHero; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}

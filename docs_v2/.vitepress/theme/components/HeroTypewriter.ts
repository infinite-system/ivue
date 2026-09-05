// HeroTypewriter.ts — the headline's finale row types itself, cycling
// through the capability list forever. SSR and no-JS render the finished
// first line; the animation only takes over after mount.
import { ref } from 'vue';
import { Reactive } from '../../../../lib/Reactive';
import { Static } from '../../../../lib/Static';

class $HeroTypewriter {
  /* Knobs — STATIC */

  static get VARIANTS() {
    return [
      'One kilobyte.',
      'Zero dependencies.',
      'Reactive super.',
      'Memory control.',
      'Circular immunity.',
      'Hot reload safe.',
      'Zero-cost creation.',
      'Minimal memory.',
      'Rocket fast.',
      'TypeScript first.',
      'Composable.',
      'Class modules.',
      'Built for AI.',
      'Invariant based.',
      'Reactive backend.',
      'Mock-free tests.',
      '100% coverage.',
      'Real object graphs.',
    ];
  }

  /** Let the fall-ins land before typing starts. */
  static get FALL_LEAD_MS() {
    return 700;
  }

  static get TYPE_DELAY_MS() {
    return 66;
  }

  static get DELETE_DELAY_MS() {
    return 32;
  }

  static get HOLD_MS() {
    return 3200;
  }

  static get REST_MS() {
    return 380;
  }

  /** The one cast per class: instance code reads its own statics here. */
  protected get self() {
    return this.constructor as typeof $HeroTypewriter;
  }

  // MUTABLE STATE
  get finaleText() {
    return ref(this.self.VARIANTS[0]);
  }

  get variantIndex() {
    return ref(0);
  }

  get timer() {
    return ref<ReturnType<typeof setTimeout> | undefined>(undefined);
  }

  // DERIVED
  get target() {
    return this.self.VARIANTS[this.variantIndex.value];
  }

  // ACTIONS
  start() {
    this.finaleText.value = '';
    this.timer.value = setTimeout(() => this.typeFinale(), this.self.FALL_LEAD_MS);
  }

  stop() {
    if (this.timer.value) clearTimeout(this.timer.value);
  }

  typeFinale() {
    const target = this.target;
    const current = this.finaleText.value;
    if (current.length < target.length) {
      this.finaleText.value = target.slice(0, current.length + 1);
      this.timer.value = setTimeout(() => this.typeFinale(), this.self.TYPE_DELAY_MS);
    } else {
      this.timer.value = setTimeout(() => this.deleteFinale(), this.self.HOLD_MS);
    }
  }

  deleteFinale() {
    const current = this.finaleText.value;
    if (current.length > 0) {
      this.finaleText.value = current.slice(0, -1);
      this.timer.value = setTimeout(() => this.deleteFinale(), this.self.DELETE_DELAY_MS);
    } else {
      this.variantIndex.value = (this.variantIndex.value + 1) % this.self.VARIANTS.length;
      this.timer.value = setTimeout(() => this.typeFinale(), this.self.REST_MS);
    }
  }
}

export namespace HeroTypewriter {
  export const $Class = Static($HeroTypewriter); // anchor — it declares statics
  export let Class = Reactive($Class); // reactive — you `new` this
  export type Instance = typeof Class.Instance; // defineExpose type & reactive() interop
}

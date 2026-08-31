import { onMounted, ref } from 'vue';
import { Reactive } from '../../../../lib/Reactive';

// The newsletter hero's spotlight: the aurora line above is the light
// SOURCE, a rendered volumetric beam descends from it, and the brand
// lockup stands lit in the beam. Clicking the lockup cycles the beam
// variants — the column, the cathedral diagonal, the aurora curtains.
class $SpotlightBeam {
  constructor() {
    onMounted(() => this.restoreChoice());
  }

  // STATE
  get beamIndex() {
    return ref(0);
  }

  // DERIVED
  get beams() {
    return SpotlightBeam.BEAMS;
  }
  get beam() {
    return this.beams[this.beamIndex.value] ?? this.beams[0];
  }
  /** A custom PROPERTY, not background-image: an inline background
   *  would beat every theme rule, and the light theme paints its own
   *  beam instead of using this one. The value is a full
   *  background-image — a gradient stack or a url(), interchangeably. */
  get beamStyle() {
    return { '--ivue-beam': this.beam.image };
  }
  get beamLabel() {
    return `Spotlight: ${this.beam.name} — click to change`;
  }

  // ACTIONS
  cycleBeam() {
    this.beamIndex.value = (this.beamIndex.value + 1) % this.beams.length;
    this.rememberChoice();
  }

  restoreChoice() {
    try {
      const stored = Number(localStorage.getItem(SpotlightBeam.STORAGE_KEY));
      if (Number.isInteger(stored) && stored >= 0 && stored < this.beams.length)
        this.beamIndex.value = stored;
    } catch {
      // storage unavailable — the default beam stands
    }
  }

  rememberChoice() {
    try {
      localStorage.setItem(
        SpotlightBeam.STORAGE_KEY,
        String(this.beamIndex.value),
      );
    } catch {
      // storage unavailable — the choice lasts for this page only
    }
  }
}

export namespace SpotlightBeam {
  export const $Class = $SpotlightBeam; // raw — children `extends` this
  export let Class = Reactive($Class); // reactive — you `new` this
  // the type of every unwrapping surface (defineExpose, reactive())
  export type Instance = typeof Class.Instance;

  /* Values */

  export const STORAGE_KEY = 'ivue-spotlight-beam';

  /** A CSS gradient stack and a rendered PNG are both valid
   *  background-image values, so painted and photographic beams live
   *  in one list. The painted one leads: it costs no bytes, scales to
   *  any width, and never has edges to clip. */
  /** Anchored BELOW the bottom edge: the light rises from the section's
   *  base, where the post strip stands. (A CSS transform would flip it
   *  in one line, but a transform on a mix-blend-mode element drops the
   *  blend entirely — measured: identical pixels with it on and off.) */
  export const PAINTED_COLUMN = [
    'radial-gradient(30% 62% at 50% 106%, rgba(186, 245, 253, 0.34), transparent 72%)',
    'radial-gradient(52% 82% at 50% 108%, rgba(103, 232, 249, 0.22), transparent 74%)',
    'radial-gradient(88% 96% at 50% 112%, rgba(99, 102, 241, 0.16), transparent 76%)',
    'radial-gradient(64% 26% at 50% 54%, rgba(125, 211, 252, 0.10), transparent 72%)',
  ].join(', ');

  export const BEAMS: Beam[] = [
    { image: PAINTED_COLUMN, name: 'painted column (CSS)' },
    { image: "url('/spotlight-beam-4.png')", name: 'column with dust' },
    { image: "url('/spotlight-beam-1.png')", name: 'divine column' },
    { image: "url('/spotlight-beam-3.png')", name: 'aurora curtains' },
  ];

  /* Types */

  export interface Beam {
    /** a full background-image value: a gradient stack or a url() */
    image: string;
    name: string;
  }
}

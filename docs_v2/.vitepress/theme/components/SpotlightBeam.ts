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
  get beamStyle() {
    return { backgroundImage: `url('${this.beam.src}')` };
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

  export const BEAMS: Beam[] = [
    { src: '/spotlight-beam-1.png', name: 'divine column' },
    { src: '/spotlight-beam-2.png', name: 'cathedral diagonal' },
    { src: '/spotlight-beam-3.png', name: 'aurora curtains' },
    { src: '/spotlight-beam-4.png', name: 'column with dust' },
  ];

  /* Types */

  export interface Beam {
    src: string;
    name: string;
  }
}

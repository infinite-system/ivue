<script setup lang="ts">
import { SpotlightBeam } from './SpotlightBeam';

const spotlight = new SpotlightBeam.Class();
</script>

<template>
  <!-- The beam lights the DELIVERY (the post strip), not the brand:
       this section's appeal is JavaScript, wider than ivue itself.
       Clicking the empty light above the strip cycles the variants. -->
  <button
    type="button"
    class="ix-spotlight"
    :style="spotlight.beamStyle"
    :title="spotlight.beamLabel"
    :aria-label="spotlight.beamLabel"
    @click="spotlight.cycleBeam()"
  />
</template>

<script setup lang="ts">
import { withBase } from 'vitepress';
import { SpotlightBeam } from './SpotlightBeam';

const spotlight = new SpotlightBeam.Class();
</script>

<template>
  <div class="ix-spotlight" aria-hidden="true" :style="spotlight.beamStyle" />
  <button
    type="button"
    class="ix-spotlight-lockup"
    :title="spotlight.beamLabel"
    :aria-label="spotlight.beamLabel"
    @click="spotlight.cycleBeam()"
  >
    <img
      class="ix-spotlight-lockup--light"
      :src="withBase('/brand-lockup-light.png')"
      alt="ivue — Infinite Vue"
      width="392"
      height="128"
    />
    <img
      class="ix-spotlight-lockup--dark"
      :src="withBase('/brand-lockup-dark.png')"
      alt="ivue — Infinite Vue"
      width="392"
      height="128"
    />
  </button>
</template>

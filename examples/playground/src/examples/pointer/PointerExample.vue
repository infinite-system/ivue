<script setup lang="ts">
import { Pointer } from './Pointer';

// the state destructure — materializes $mouse inside the component's scope,
// so its listeners are cleaned up on unmount
const {
  // state refs
  x,
  y,
} = new Pointer.Class();
</script>

<template>
  <div class="pane">
    <p class="note">
      The component destructures x and y from a Pointer instance. useMouse
      lives inside the class — private, created once on the first read.
    </p>
    <div class="vals">
      <div>
        <div class="k">x · page</div>
        <div class="n">{{ x }}</div>
      </div>
      <div>
        <div class="k">y · page</div>
        <div class="n">{{ y }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped src="../example-pane.css"></style>

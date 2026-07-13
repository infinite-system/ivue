<script setup lang="ts">
import { Pointer } from './Pointer';

// materializes $mouse inside the component's scope, so its listeners are
// cleaned up on unmount
const pointer = new Pointer.Class();
</script>

<template>
  <div class="pane">
    <p class="note">
      useMouse lives inside the class — private, created once on the first
      read. The readouts are pageX/pageY, plain getters that round the raw
      coordinates to whole pixels.
    </p>
    <div class="vals">
      <div>
        <div class="k">x · page</div>
        <div class="n">{{ pointer.pageX }}</div>
      </div>
      <div>
        <div class="k">y · page</div>
        <div class="n">{{ pointer.pageY }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped src="../example-pane.css"></style>

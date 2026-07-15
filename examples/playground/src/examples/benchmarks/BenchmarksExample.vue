<script setup lang="ts">
import { BenchmarksExample, CALL_COUNT } from './BenchmarksExample';
import { INSTANCE_COUNT } from './creationBench';
import BenchmarkWinner from './BenchmarkWinner.vue';

const bench = new BenchmarksExample.Class();

// the state destructure
const {
  // state refs
  ivueMs,
  reactiveMs,
  composableMs,
  running,
  boxCreationMs,
  methodMs,
  boxRunning,
} = bench;
</script>

<template>
  <div class="pane">
    <p class="note">
      Same shape for all three: two state values and a derived area. Numbers
      depend on your machine — the ratio is the point. Every instance is
      retained and touched after timing so the JIT cannot elide the work.
    </p>
    <div class="vals">
      <div>
        <div class="k">ivue · new Class()</div>
        <div class="n grad">
          {{ bench.format(ivueMs)
          }}<BenchmarkWinner v-if="ivueMs !== null" placement="after" />
        </div>
      </div>
      <div>
        <div class="k">
          reactive(new X())
          <span v-if="reactiveMs !== null"
            >· {{ bench.ratio(reactiveMs) }}</span
          >
        </div>
        <div class="n">{{ bench.format(reactiveMs) }}</div>
      </div>
      <div>
        <div class="k">
          composable factory
          <span v-if="composableMs !== null">
            · {{ bench.ratio(composableMs) }}
          </span>
        </div>
        <div class="n">{{ bench.format(composableMs) }}</div>
      </div>
    </div>
    <div class="row">
      <button
        class="btn primary"
        type="button"
        :disabled="running"
        @click="bench.runCreation()"
      >
        {{
          running
            ? 'Running…'
            : ivueMs === null
              ? `Create ${INSTANCE_COUNT.toLocaleString()} instances`
              : 'Run again'
        }}
      </button>
    </div>

    <p class="note" style="margin-top: 28px">
      InteractiveBox is a three-level Reactive() hierarchy hosting a composable.
      Creation stays plain-object cheap because nothing materializes until first
      access; the method benchmark hammers a prototype-bound method with
      reactive reads inside.
    </p>
    <div class="vals">
      <div>
        <div class="k">
          create {{ INSTANCE_COUNT.toLocaleString() }} InteractiveBoxes
        </div>
        <div class="n grad">{{ bench.format(boxCreationMs) }}</div>
      </div>
      <div>
        <div class="k">{{ CALL_COUNT.toLocaleString() }} method calls</div>
        <div class="n">{{ bench.format(methodMs) }}</div>
      </div>
    </div>
    <div class="row">
      <button
        class="btn primary"
        type="button"
        :disabled="boxRunning"
        @click="bench.runInteractiveBox()"
      >
        {{
          boxRunning
            ? 'Running…'
            : boxCreationMs === null
              ? 'Run the hierarchy benchmark'
              : 'Run again'
        }}
      </button>
    </div>
  </div>
</template>

<style scoped src="../example-pane.css"></style>

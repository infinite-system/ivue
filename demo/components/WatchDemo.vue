<script setup lang="ts">
import { shallowRef } from 'vue';
import { WatchModel } from './WatchModel';

// A plain (non-proxy) Reactive instance. shallowRef lets us swap it on dispose.
const model = shallowRef(new WatchModel.Class());

const statusRing: Record<string, string> = {
  sky: 'bg-sky-500/15 text-sky-300 ring-sky-400/30',
  blue: 'bg-blue-500/15 text-blue-300 ring-blue-400/30',
  emerald: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30',
  amber: 'bg-amber-500/15 text-amber-300 ring-amber-400/30',
  rose: 'bg-rose-500/15 text-rose-300 ring-rose-400/30',
};

const toggleWatch = () => {
  if (model.value.watching.value) model.value.stopWatch();
  else model.value.startWatch();
};

const disposed = shallowRef(false);
const dispose = () => {
  // Full teardown: stops the effect scope (all $watch watchers) AND clears
  // every cached ref/computed so the instance can be garbage-collected.
  model.value.$stopEffects();
  // Swap in a fresh instance so the UI rebinds to brand-new reactive cells.
  model.value = new WatchModel.Class();
  disposed.value = true;
  setTimeout(() => (disposed.value = false), 2200);
};
</script>

<template>
  <section class="space-y-8">
    <header class="space-y-2">
      <div
        class="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300 ring-1 ring-indigo-400/30"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
        Reactive.ts · $watch + lazy effect scope
      </div>
      <h1 class="text-3xl font-extrabold tracking-tight text-white">
        Watch &amp; teardown, the v2 way
      </h1>
      <p class="max-w-2xl text-sm leading-relaxed text-slate-400">
        This thermostat is a plain class instance — no per-instance proxy. State
        is declared as getters returning <code class="text-indigo-300">ref()</code> /
        <code class="text-indigo-300">computed()</code>. Watchers are registered with
        <code class="text-indigo-300">this.$watch(...)</code>, which lazily allocates one
        effect scope per instance and returns a stop handle.
        <code class="text-indigo-300">$stopEffects()</code> stops the whole scope and
        clears every cached cell.
      </p>
    </header>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <!-- Thermostat -->
      <div
        class="lg:col-span-3 rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur"
      >
        <div class="flex items-start justify-between">
          <div>
            <div class="text-xs uppercase tracking-wider text-slate-400">
              {{ model.label.value }}
            </div>
            <div class="mt-1 flex items-baseline gap-2">
              <span class="text-6xl font-extrabold tabular-nums text-white">
                {{ model.celsius.value }}°
              </span>
              <span class="text-2xl font-semibold text-slate-400">C</span>
            </div>
            <div class="mt-1 text-sm text-slate-400">
              {{ model.fahrenheit.value }} °F
            </div>
          </div>
          <span
            class="rounded-full px-3 py-1 text-sm font-semibold ring-1"
            :class="statusRing[model.status.value.color]"
          >
            {{ model.status.value.text }}
          </span>
        </div>

        <input
          type="range"
          min="-10"
          max="40"
          class="mt-6 w-full"
          v-model.number="model.celsius.value"
        />

        <div class="mt-5 flex flex-wrap items-center gap-3">
          <button
            class="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/20"
            @click="model.step(-1)"
          >
            − 1°C
          </button>
          <button
            class="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/20"
            @click="model.step(1)"
          >
            + 1°C
          </button>
          <label class="ml-2 text-sm text-slate-400">Set °F</label>
          <input
            type="number"
            class="w-24 rounded-lg bg-slate-900/60 px-3 py-2 text-sm text-white ring-1 ring-white/15 focus:outline-none focus:ring-indigo-400/50"
            v-model.number="model.fahrenheit.value"
          />
        </div>
      </div>

      <!-- Watcher panel -->
      <div
        class="lg:col-span-2 flex flex-col rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur"
      >
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold text-white">Watcher</h2>
          <span
            class="rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1"
            :class="
              model.watching.value
                ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30'
                : 'bg-slate-500/15 text-slate-300 ring-slate-400/30'
            "
          >
            {{ model.watching.value ? 'WATCHING' : 'IDLE' }}
          </span>
        </div>

        <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div class="rounded-lg bg-black/20 p-3">
            <dt class="text-xs text-slate-400">Times fired</dt>
            <dd class="text-xl font-bold tabular-nums text-white">
              {{ model.fireCount.value }}
            </dd>
          </div>
          <div class="rounded-lg bg-black/20 p-3">
            <dt class="text-xs text-slate-400">Effect scope</dt>
            <dd class="text-sm font-semibold text-white">
              {{ model.scopeStarted.value ? 'allocated' : 'not allocated' }}
            </dd>
          </div>
        </dl>

        <button
          class="mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-bold text-white shadow-lg transition"
          :class="
            model.watching.value
              ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'
              : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
          "
          @click="toggleWatch"
        >
          {{ model.watching.value ? 'Stop watching (stop handle)' : 'Start watching ($watch)' }}
        </button>

        <div class="mt-4 flex-1">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-xs uppercase tracking-wider text-slate-400">Change log</span>
            <button
              class="text-xs text-slate-400 underline-offset-2 hover:text-white hover:underline"
              @click="model.clearLog()"
            >
              clear
            </button>
          </div>
          <ul class="space-y-1.5 font-mono text-xs">
            <li
              v-for="entry in model.log.value"
              :key="entry.id"
              class="flex items-center gap-2 rounded-md bg-black/20 px-3 py-1.5 text-emerald-300"
            >
              <span class="text-slate-500">#{{ entry.id }}</span>
              {{ entry.text }}
            </li>
            <li
              v-if="!model.log.value.length"
              class="rounded-md border border-dashed border-white/10 px-3 py-3 text-center text-slate-500"
            >
              {{ model.watching.value ? 'Move the slider to fire the watcher →' : 'Start watching, then change the temperature' }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Teardown -->
    <div
      class="flex flex-col items-start justify-between gap-4 rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur sm:flex-row sm:items-center"
    >
      <div class="max-w-xl text-sm text-slate-400">
        <span class="font-semibold text-white">$stopEffects()</span> stops the
        effect scope (every <code class="text-indigo-300">$watch</code>) and deletes all
        cached refs/computeds so the instance is collectable. Pure-data instances
        that never call <code class="text-indigo-300">$watch</code> allocate no scope at all.
      </div>
      <div class="flex items-center gap-3">
        <span
          v-if="disposed"
          class="text-xs font-semibold text-emerald-300"
        >
          ✓ disposed &amp; reinitialized
        </span>
        <button
          class="rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-600"
          @click="dispose"
        >
          Dispose instance ($stopEffects)
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';

const cards = [
  {
    to: '/watch',
    tag: 'v2 · interactive',
    accent: 'indigo',
    title: 'Watch & Teardown',
    desc: 'A live thermostat built with Reactive(). Register watchers with $watch, see them fire, and tear everything down with $stopEffects.',
  },
  {
    to: '/class-composable-benchmark',
    tag: 'v2 · benchmark',
    accent: 'indigo',
    title: 'Reactive v2 Benchmark',
    desc: 'Instantiate a 3-level reactive class hierarchy (plain instances, lazy refs/computeds) and time creation + method execution.',
  },
  {
    to: '/ivue-benchmark',
    tag: 'v1 · benchmark',
    accent: 'emerald',
    title: 'ivue v1 Benchmark',
    desc: 'The classic engine: every instance wrapped in Vue reactive(), getters eagerly converted to computeds. Pure-class ergonomics.',
  },
  {
    to: '/composable-benchmark',
    tag: 'native · baseline',
    accent: 'sky',
    title: 'Native Composable',
    desc: 'The idiomatic Vue 3 baseline — a factory eagerly creating ref()/computed() per instance. The reference point for both engines.',
  },
  {
    to: '/grid-ivue',
    tag: 'grid · ivue',
    accent: 'indigo',
    title: 'Grid — ivue Model',
    desc: '100,000-cell virtualized spreadsheet. Each cell is a Reactive() class $Cell: ref-getter + plain getters + one hot computed. Lazy, tens of MB.',
  },
  {
    to: '/grid-composable',
    tag: 'grid · composable',
    accent: 'sky',
    title: 'Grid — Composable Model',
    desc: 'The same 100,000-cell grid, but every cell eagerly builds a ref + four computeds. Idiomatic composable-per-entity — and hundreds of MB.',
  },
  {
    to: '/grid-pojo',
    tag: 'grid · floor',
    accent: 'sky',
    title: 'Grid — POJO Floor',
    desc: 'The same grid as plain non-reactive objects. The memory floor both reactive arms are measured against.',
  },
];

const accentRing: Record<string, string> = {
  indigo: 'bg-indigo-500/15 text-indigo-300 ring-indigo-400/30',
  emerald: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30',
  sky: 'bg-sky-500/15 text-sky-300 ring-sky-400/30',
};
const accentHover: Record<string, string> = {
  indigo: 'hover:ring-indigo-400/40',
  emerald: 'hover:ring-emerald-400/40',
  sky: 'hover:ring-sky-400/40',
};
</script>

<template>
  <section class="space-y-10">
    <!-- Hero -->
    <div class="space-y-4 pt-4 text-center">
      <div
        class="mx-auto inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300 ring-1 ring-white/10"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
        Infinite Vue · class-based reactivity for Vue 3
      </div>
      <h1
        class="bg-gradient-to-br from-white via-slate-200 to-slate-400 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent"
      >
        ivue Playground
      </h1>
      <p class="mx-auto max-w-2xl text-base leading-relaxed text-slate-400">
        Two reactivity engines, side by side. Pick a demo below — nothing runs
        until you open it.
      </p>
    </div>

    <!-- Demo cards -->
    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <RouterLink
        v-for="card in cards"
        :key="card.to"
        :to="card.to"
        class="group flex flex-col rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/[0.07]"
        :class="accentHover[card.accent]"
      >
        <span
          class="inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1"
          :class="accentRing[card.accent]"
        >
          {{ card.tag }}
        </span>
        <h2 class="mt-3 text-xl font-bold text-white">{{ card.title }}</h2>
        <p class="mt-2 flex-1 text-sm leading-relaxed text-slate-400">
          {{ card.desc }}
        </p>
        <span
          class="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-white"
        >
          Open
          <span class="transition group-hover:translate-x-0.5">→</span>
        </span>
      </RouterLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';

const links = [
  { to: '/watch', label: 'Watch & Teardown', tag: 'v2', accent: 'indigo' },
  { to: '/class-composable-benchmark', label: 'Reactive v2 Benchmark', tag: 'v2', accent: 'indigo' },
  { to: '/ivue-benchmark', label: 'ivue v1 Benchmark', tag: 'v1', accent: 'emerald' },
  { to: '/composable-benchmark', label: 'Native Composable', tag: 'vue', accent: 'sky' },
];
</script>

<template>
  <div class="min-h-full">
    <!-- Top bar -->
    <header
      class="sticky top-0 z-20 border-b border-white/10 bg-[#0b1020]/80 backdrop-blur-xl"
    >
      <div class="mx-auto max-w-6xl px-4 py-3">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <RouterLink to="/" class="flex items-center gap-3 transition hover:opacity-80">
            <div
              class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-400 font-extrabold text-white shadow-lg"
            >
              iv
            </div>
            <div>
              <div class="text-sm font-bold leading-tight text-white">
                ivue <span class="text-slate-400">· Reactive Class Playground</span>
              </div>
              <div class="text-[11px] text-slate-500">
                Infinite Vue — class-based reactivity for Vue 3
              </div>
            </div>
          </RouterLink>

          <nav class="flex flex-wrap gap-1.5">
            <RouterLink
              v-for="link in links"
              :key="link.to"
              :to="link.to"
              class="group inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-300 ring-1 ring-transparent transition hover:bg-white/5 hover:text-white"
              active-class="!bg-white/10 !text-white !ring-white/15"
            >
              {{ link.label }}
              <span
                class="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1"
                :class="{
                  'bg-indigo-500/15 text-indigo-300 ring-indigo-400/30': link.accent === 'indigo',
                  'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30': link.accent === 'emerald',
                  'bg-sky-500/15 text-sky-300 ring-sky-400/30': link.accent === 'sky',
                }"
              >
                {{ link.tag }}
              </span>
            </RouterLink>
          </nav>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-8">
      <RouterView />
    </main>

    <footer class="mx-auto max-w-6xl px-4 pb-10 pt-4 text-center text-xs text-slate-600">
      Built with ivue · <span class="font-mono">Reactive.ts</span> — plain class instances, fine-grained reactivity, zero per-instance proxy.
    </footer>
  </div>
</template>

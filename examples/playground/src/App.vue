<script setup lang="ts">
import { Playground } from './Playground';

const playground = new Playground.Class();

// the state destructure — every Ref the template touches, grouped
const {
  // state refs
  route,
} = playground;
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <h1>ivue playground</h1>
      <p class="tagline">every doc example, one deployable app</p>
      <nav>
        <button
          v-for="example in playground.examples"
          :key="example.slug"
          type="button"
          :class="{ active: example.slug === playground.activeExample.slug }"
          @click="playground.navigate(example.slug)"
        >
          <span class="title">{{ example.title }}</span>
          <span class="blurb">{{ example.blurb }}</span>
        </button>
      </nav>
    </aside>
    <section class="stage">
      <header class="stage-header">
        <h2>{{ playground.activeExample.title }}</h2>
        <a
          href="https://infinite-system.github.io/ivue/"
          target="_blank"
          rel="noreferrer"
          >docs ↗</a
        >
      </header>
      <div class="stage-body">
        <component
          :is="playground.activeComponent"
          :key="route || playground.activeExample.slug"
        />
      </div>
    </section>
  </div>
</template>

<style>
* {
  margin: 0;
  box-sizing: border-box;
}
body {
  font-family: -apple-system, 'Segoe UI', Roboto, sans-serif;
  /* explicit so Quasar's layered body reset can never re-metric the shell */
  line-height: 1.45;
  /* the docs' dark palette, exactly */
  background: #0b1020;
  color: #b7c0dc;
}
.shell {
  display: flex;
  /* min-height, not height: tall examples grow the page and keep the
     body as the scroll container (the Lenis example depends on it) */
  min-height: 100vh;
  min-height: 100dvh;
}
.sidebar {
  width: 260px;
  flex-shrink: 0;
  padding: 18px 14px;
  border-right: 1px solid rgba(148, 163, 184, 0.14);
  background: #0e1424;
  /* pinned to the viewport while the stage scrolls — the list is
     always reachable, scrolling internally past viewport height */
  position: sticky;
  top: 0;
  height: 100vh;
  height: 100dvh;
  align-self: flex-start;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.25) transparent;
}
.sidebar::-webkit-scrollbar {
  width: 10px;
}
.sidebar::-webkit-scrollbar-track {
  background: transparent;
}
.sidebar::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  /* inset ring in the sidebar's own background — the thumb reads as
     part of the panel, not a browser control */
  border: 3px solid #0e1424;
}
.sidebar::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.34);
}
.sidebar h1 {
  font-size: 16px;
  color: #fff;
}
.tagline {
  margin: 4px 0 16px;
  font-size: 12px;
  color: #64748b;
}
.sidebar nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sidebar nav button {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.sidebar nav button:hover {
  background: rgba(255, 255, 255, 0.04);
}
.sidebar nav button.active {
  border-color: rgba(99, 102, 241, 0.45);
  background: rgba(99, 102, 241, 0.1);
}
.sidebar nav .title {
  font-size: 13.5px;
  color: #dbe1f4;
  font-weight: 600;
}
.sidebar nav .blurb {
  font-size: 12px;
  color: #8b95b5;
  line-height: 1.45;
}
.stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.stage-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}
.stage-header h2 {
  font-size: 16px;
  color: #fff;
}
.stage-header a {
  font-size: 12.5px;
  color: #7dd3fc;
  text-decoration: none;
}
.stage-body {
  flex: 1;
  min-height: 0;
}

@media (max-width: 720px) {
  .shell {
    flex-direction: column;
  }
  .sidebar {
    width: 100%;
    height: auto;
    max-height: 40vh;
    border-right: none;
    border-bottom: 1px solid rgba(148, 163, 184, 0.16);
  }
}
</style>

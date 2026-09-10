<script setup lang="ts">
import LazyCodeGroup from '../LazyCodeGroup.vue';
import { ExampleMalleability } from './ExampleMalleability';

const demo = new ExampleMalleability.Class();

// the state destructure — every Ref the template touches
const {
  // state refs
  selectedId,
} = demo;
</script>

<template>
  <div class="malleability-embed" :data-variant="selectedId">
    <div class="mal-picker" role="tablist" aria-label="Override to apply">
      <button
        v-for="variant in demo.variants"
        :key="variant.id"
        type="button"
        role="tab"
        class="mal-tab"
        :class="{ 'mal-tab-on': demo.isSelected(variant) }"
        :aria-selected="demo.isSelected(variant)"
        @click="demo.select(variant)"
      >
        {{ variant.label }}
      </button>
    </div>

    <p class="mal-tagline">{{ demo.selected.tagline }}</p>

    <div class="mal-stage">
      <section class="mal-live">
        <div class="mal-caption">Gallery.vue, rendered with this entry</div>
        <p class="mal-legend">{{ demo.liveLabel }}</p>
        <!-- the seam: the entry's vue, the entry as `kit`, the child's own props -->
        <component :is="demo.entry.vue" :key="selectedId" :kit="demo.entry" />
      </section>

      <section class="mal-side">
        <div class="mal-caption">The resolved kit, against the shipped one</div>
        <p class="mal-legend">{{ demo.changedLabel }}</p>
        <ol class="mal-tree">
          <li
            v-for="line in demo.inspector"
            :key="line.key"
            :class="{ 'mal-changed': line.changed }"
          >
            <span class="mal-role" :style="{ '--depth': line.depth }">{{ line.role }}</span>
            <span class="mal-cells">
              <span class="mal-cell">
                <template v-if="line.changedView"><s class="mal-was">{{ line.wasView }}</s><span class="mal-now">{{ line.vue }}</span></template>
                <span v-else class="mal-same">{{ line.vue }}</span>
              </span>
              <span class="mal-cell" v-if="line.className">
                <template v-if="line.changedClass"><s class="mal-was">{{ line.wasClass }}</s><span class="mal-now">{{ line.className }}</span></template>
                <span v-else class="mal-same">{{ line.className }}</span>
                <span v-if="line.derived" class="mal-badge">derived</span>
              </span>
              <span v-if="line.props" class="mal-cell mal-cell-props"><span class="mal-now mal-props">{{ line.props }}</span></span>
            </span>
          </li>
        </ol>

        <div class="mal-caption">The override, as data</div>
        <pre class="mal-patch"><code v-html="demo.patchHtml"></code></pre>
      </section>
    </div>

    <div class="mal-caption mal-files-caption">The files behind this override</div>
    <LazyCodeGroup :key="selectedId" :files="demo.selected.files" />
  </div>
</template>

<style>
.malleability-embed {
  margin: 22px 0;
  padding: 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  font-size: 13px;
}
.malleability-embed .vp-code-group {
  margin-top: 0;
}
.mal-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.mal-tab {
  padding: 6px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.mal-tab:hover {
  border-color: var(--vp-c-brand-2);
}
.mal-tab-on {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
/* fixed height, so a longer tagline never pushes the stage down */
.mal-tagline {
  min-height: 4.8em;
  margin: 12px 0 10px;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}
.mal-stage {
  display: grid;
  grid-template-columns: minmax(0, 6fr) minmax(0, 6fr);
  gap: 16px;
  /* one height for every override, so switching tabs never moves what is below */
  min-height: 860px;
}
.mal-live {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

@media (max-width: 720px) {
  .mal-stage {
    grid-template-columns: minmax(0, 1fr);
    min-height: 0;
  }
}
.mal-caption {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}
.mal-files-caption {
  margin-top: 18px;
}
.mal-legend {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 1.6em;
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--vp-c-text-3);
}
.malleability-embed .mal-tree {
  list-style: none;
  margin: 0 0 14px;
  padding: 6px 0;
  padding-left: 5px;
  border-top: 1px solid var(--vp-c-divider);
  border-bottom: 1px solid var(--vp-c-divider);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
}
.malleability-embed .mal-tree li {
  display: grid;
  grid-template-columns: 4.5em minmax(0, 1fr);
  column-gap: 8px;
  align-items: baseline;
  min-height: 26px;
  margin: 0;
  padding: 3px 0;
  border-radius: 6px;
  color: var(--vp-c-text-2);
}
.malleability-embed .mal-tree li + li {
  margin-top: 1px;
}
.malleability-embed .mal-tree li.mal-changed {
  padding: 4px 8px;
  background: var(--vp-c-brand-soft);
}
.mal-role {
  color: var(--vp-c-text-1);
  font-weight: 600;
  opacity: calc(1 - var(--depth) * 0.2);
}
.mal-cells {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.mal-cell {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}
.mal-same {
  color: var(--vp-c-text-3);
}
.mal-was {
  color: var(--vp-c-text-3);
  text-decoration-color: var(--vp-c-danger-1);
}
.mal-now {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
.mal-now::before {
  content: '→';
  margin-right: 6px;
  color: var(--vp-c-text-3);
  font-weight: 400;
}
.mal-props.mal-now::before {
  content: '+';
}
.mal-badge {
  padding: 0 6px;
  border-radius: 999px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-brand-2);
  color: var(--vp-c-brand-1);
  font-size: 10px;
  line-height: 16px;
}
.mal-str {
  color: var(--vp-c-brand-1);
}
.mal-lit {
  color: var(--vp-c-text-2);
  font-weight: 600;
}
.mal-id {
  color: var(--vp-c-text-1);
  font-weight: 600;
}
.mal-key {
  color: var(--vp-c-text-3);
}
.mal-cmt {
  color: var(--vp-c-text-3);
  font-style: italic;
}
.mal-patch {
  min-height: 150px;
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--vp-code-block-bg);
  color: var(--vp-c-text-1);
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

/* the demo tree's own classes — these files carry no styles; the page owns the look.
   Every card paints from --snip-* (the block's palette, set by Snippet.cardStyle) */
.malleability-embed .gallery {
  display: grid;
  gap: 12px;
}
.malleability-embed .snip {
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--snip-bg);
  color: var(--snip-fg);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
}
/* the shipped head and foot */
.malleability-embed .snip-head,
.malleability-embed .snip-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  background: color-mix(in srgb, var(--snip-fg) 6%, var(--snip-bg));
  border-bottom: 1px solid color-mix(in srgb, var(--snip-fg) 12%, transparent);
}
.malleability-embed .snip-foot {
  border-bottom: 0;
  border-top: 1px solid color-mix(in srgb, var(--snip-fg) 12%, transparent);
  font-size: 11px;
  opacity: 0.85;
}
.malleability-embed .snip-name {
  font-weight: 600;
}
.malleability-embed .snip-engine {
  margin-right: auto;
  padding: 0 6px;
  border-radius: 999px;
  border: 1px solid var(--snip-accent);
  color: var(--snip-accent);
  font-size: 10px;
}
.malleability-embed .snip-lang {
  padding: 0 6px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--snip-fg) 25%, transparent);
  font-size: 10px;
  opacity: 0.8;
}
.malleability-embed .snip-copy {
  padding: 2px 9px;
  border: 1px solid var(--snip-accent);
  border-radius: 999px;
  background: transparent;
  color: var(--snip-accent);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}
.malleability-embed .snip-copy:hover {
  background: var(--snip-accent);
  color: var(--snip-bg);
}
/* the swapped head: an editor tab bar, painted from the block's palette */
.malleability-embed .tab-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-bottom: 2px solid var(--snip-accent);
  background: color-mix(in srgb, var(--snip-accent) 14%, var(--snip-bg));
}
.malleability-embed .tab-dots {
  display: inline-flex;
  gap: 5px;
}
.malleability-embed .tab-dots i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--snip-accent);
  opacity: 0.35;
}
.malleability-embed .tab-dots i:first-child {
  opacity: 0.9;
}
.malleability-embed .tab-tab {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 2px 10px;
  border-radius: 6px 6px 0 0;
  background: var(--snip-bg);
  border: 1px solid var(--snip-accent);
  border-bottom-color: var(--snip-bg);
  margin-bottom: -8px;
  font-weight: 600;
}
.malleability-embed .tab-meta {
  margin-left: auto;
  flex-shrink: 0;
  display: inline-flex;
  gap: 6px;
  font-size: 10px;
  white-space: nowrap;
  opacity: 0.85;
}
.malleability-embed .tab-theme,
.malleability-embed .tab-engine {
  padding: 0 6px;
  border-radius: 999px;
  background: var(--snip-accent);
  color: var(--snip-bg);
}
.malleability-embed .tab-engine {
  background: transparent;
  color: var(--snip-accent);
  border: 1px solid var(--snip-accent);
}
/* the swapped foot: a status bar */
.malleability-embed .stats-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 10px;
  border-top: 2px solid var(--snip-accent);
  background: color-mix(in srgb, var(--snip-accent) 14%, var(--snip-bg));
  font-size: 11px;
}
.malleability-embed .stats-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 0;
}
.malleability-embed .stats-list div {
  display: inline-flex;
  gap: 4px;
}
.malleability-embed .stats-list dt {
  opacity: 0.6;
}
.malleability-embed .stats-list dd {
  margin: 0;
  color: var(--snip-accent);
  font-weight: 600;
}
.malleability-embed .stats-foot .snip-copy {
  margin-left: auto;
}
/* the code block: the engine's pre, an optional gutter, a fold button */
.malleability-embed .code-block {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  background: var(--code-bg);
  color: var(--code-fg);
}
.malleability-embed .code-numbered {
  grid-template-columns: auto minmax(0, 1fr);
}
.malleability-embed .code-gutter {
  list-style: none;
  margin: 0;
  padding: 10px 0 10px 10px;
  text-align: right;
  line-height: 1.55;
  opacity: 0.45;
  user-select: none;
}
.malleability-embed .code-gutter li {
  padding: 0;
  margin: 0;
}
.malleability-embed .code-html {
  min-width: 0;
  overflow-x: auto;
}
.malleability-embed .code-pre {
  margin: 0;
  padding: 10px 12px;
  background: var(--code-bg) !important;
  color: var(--code-fg);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  line-height: 1.55;
  white-space: pre;
}
.malleability-embed .code-fold {
  grid-column: 1 / -1;
  padding: 4px 10px;
  border: 0;
  border-top: 1px dashed color-mix(in srgb, var(--code-fg) 25%, transparent);
  background: color-mix(in srgb, var(--code-accent) 10%, var(--code-bg));
  color: var(--code-accent);
  font: inherit;
  font-size: 11px;
  text-align: left;
  cursor: pointer;
}
/* highlight.js classes tokens; each theme is a small stylesheet, keyed by the block's theme */
.malleability-embed .hljs .hljs-comment { font-style: italic; }
.malleability-embed .hljs[data-theme='github-light'] { background: #fafafa !important; }
.malleability-embed .hljs[data-theme='github-light'] .hljs-keyword { color: #a626a4; font-weight: 600; }
.malleability-embed .hljs[data-theme='github-light'] .hljs-string { color: #50a14f; }
.malleability-embed .hljs[data-theme='github-light'] .hljs-comment { color: #a0a1a7; }
.malleability-embed .hljs[data-theme='github-light'] .hljs-number { color: #986801; }
.malleability-embed .hljs[data-theme='github-light'] .hljs-title,
.malleability-embed .hljs[data-theme='github-light'] .hljs-name,
.malleability-embed .hljs[data-theme='github-light'] .hljs-selector-class { color: #4078f2; }
.malleability-embed .hljs[data-theme='github-light'] .hljs-attr,
.malleability-embed .hljs[data-theme='github-light'] .hljs-attribute,
.malleability-embed .hljs[data-theme='github-light'] .hljs-built_in { color: #c18401; }
.malleability-embed .hljs[data-theme='github-light'] .hljs-tag { color: #e45649; }
.malleability-embed .hljs[data-theme='dracula'] .hljs-keyword { color: #ff79c6; }
.malleability-embed .hljs[data-theme='dracula'] .hljs-string { color: #f1fa8c; }
.malleability-embed .hljs[data-theme='dracula'] .hljs-comment { color: #6272a4; }
.malleability-embed .hljs[data-theme='dracula'] .hljs-number { color: #bd93f9; }
.malleability-embed .hljs[data-theme='dracula'] .hljs-title,
.malleability-embed .hljs[data-theme='dracula'] .hljs-name,
.malleability-embed .hljs[data-theme='dracula'] .hljs-selector-class { color: #50fa7b; }
.malleability-embed .hljs[data-theme='dracula'] .hljs-attr,
.malleability-embed .hljs[data-theme='dracula'] .hljs-attribute,
.malleability-embed .hljs[data-theme='dracula'] .hljs-built_in { color: #8be9fd; }
.malleability-embed .hljs[data-theme='dracula'] .hljs-tag { color: #ff79c6; }
.malleability-embed .hljs[data-theme='nord'] .hljs-keyword { color: #81a1c1; }
.malleability-embed .hljs[data-theme='nord'] .hljs-string { color: #a3be8c; }
.malleability-embed .hljs[data-theme='nord'] .hljs-comment { color: #616e88; }
.malleability-embed .hljs[data-theme='nord'] .hljs-number { color: #b48ead; }
.malleability-embed .hljs[data-theme='nord'] .hljs-title,
.malleability-embed .hljs[data-theme='nord'] .hljs-name,
.malleability-embed .hljs[data-theme='nord'] .hljs-selector-class { color: #88c0d0; }
.malleability-embed .hljs[data-theme='nord'] .hljs-attr,
.malleability-embed .hljs[data-theme='nord'] .hljs-attribute,
.malleability-embed .hljs[data-theme='nord'] .hljs-built_in { color: #8fbcbb; }
.malleability-embed .hljs[data-theme='nord'] .hljs-tag { color: #81a1c1; }
.malleability-embed .hljs[data-theme='one-dark-pro'] .hljs-keyword { color: #c678dd; }
.malleability-embed .hljs[data-theme='one-dark-pro'] .hljs-string { color: #98c379; }
.malleability-embed .hljs[data-theme='one-dark-pro'] .hljs-comment { color: #5c6370; }
.malleability-embed .hljs[data-theme='one-dark-pro'] .hljs-number { color: #d19a66; }
.malleability-embed .hljs[data-theme='one-dark-pro'] .hljs-title,
.malleability-embed .hljs[data-theme='one-dark-pro'] .hljs-name,
.malleability-embed .hljs[data-theme='one-dark-pro'] .hljs-selector-class { color: #61afef; }
.malleability-embed .hljs[data-theme='one-dark-pro'] .hljs-attr,
.malleability-embed .hljs[data-theme='one-dark-pro'] .hljs-attribute,
.malleability-embed .hljs[data-theme='one-dark-pro'] .hljs-built_in { color: #e5c07b; }
.malleability-embed .hljs[data-theme='one-dark-pro'] .hljs-tag { color: #e06c75; }
</style>

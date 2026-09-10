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
        <div class="mal-caption">Panel.vue, rendered with this entry</div>
        <p class="mal-legend"><span class="mal-swatch"></span> parts the override replaced or tuned</p>
        <!-- the seam: the entry's vue, the entry as `kit`, the child's own props -->
        <component :is="demo.entry.vue" :key="selectedId" :kit="demo.entry" :titles="demo.titles" />
      </section>

      <section class="mal-side">
        <div class="mal-caption">The resolved kit, against the shipped one</div>
        <p class="mal-legend">{{ demo.changedLabel }}</p>
        <ol class="mal-tree">
          <li
            v-for="line in demo.inspector"
            :key="line.key"
            :style="{ '--depth': line.depth }"
            :class="{ 'mal-changed': line.changed }"
          >
            <span class="mal-role">{{ line.role }}</span>
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
        <pre class="mal-patch"><code>{{ demo.selected.patch }}</code></pre>
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
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  gap: 16px;
  /* the tallest override's height, so switching tabs never moves what is below */
  min-height: 630px;
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
.mal-swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 4px;
  border: 2px solid var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}
.mal-tree {
  list-style: none;
  margin: 0 0 14px;
  padding: 6px 0;
  border-top: 1px solid var(--vp-c-divider);
  border-bottom: 1px solid var(--vp-c-divider);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
}
.mal-tree li {
  display: grid;
  grid-template-columns: 5.5em minmax(0, 1fr);
  column-gap: 8px;
  align-items: baseline;
  min-height: 26px;
  padding: 2px 6px 2px calc(6px + var(--depth) * 16px);
  border-radius: 6px;
  color: var(--vp-c-text-2);
}
.mal-tree li.mal-changed {
  background: var(--vp-c-brand-soft);
}
.mal-role {
  color: var(--vp-c-text-1);
  font-weight: 600;
}
.mal-cells {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 12px;
  row-gap: 2px;
}
.mal-cell {
  display: inline-flex;
  flex-wrap: nowrap;
  align-items: baseline;
  gap: 6px;
  white-space: nowrap;
}
.mal-cell-props {
  flex-wrap: wrap;
  white-space: normal;
}
.mal-cell + .mal-cell::before {
  content: '·';
  color: var(--vp-c-text-3);
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

/* the fixture tree's own classes — these files have no styles of their own;
   every part an override can replace gets the brand outline when replaced */
.malleability-embed .panel {
  display: grid;
  gap: 12px;
}
.malleability-embed .card {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg);
}
.malleability-embed .card-head,
.malleability-embed .fancy-head {
  margin: 0;
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}
.malleability-embed .fancy-head {
  border: 2px solid var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  letter-spacing: 0.04em;
  text-align: center;
}
.malleability-embed .card-body,
.malleability-embed .grouped-body {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px;
  border-radius: 6px;
}
.malleability-embed .grouped-body {
  flex-direction: column;
  border: 2px solid var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  counter-reset: grouped;
}
.malleability-embed .grouped-body .code::before {
  counter-increment: grouped;
  content: counter(grouped) '. ';
  opacity: 0.6;
}
.malleability-embed .code {
  margin: 0;
  padding: 4px 8px;
  border-radius: 6px;
  border: 2px solid transparent;
  background: var(--vp-code-block-bg);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  cursor: pointer;
}
.malleability-embed .code[data-theme='mono'] {
  border-color: var(--vp-c-brand-1);
  background: #111;
  color: #e6e6e6;
}
.malleability-embed .code[data-theme='mono']::after {
  content: ' mono';
  font-size: 10px;
  opacity: 0.6;
}
.malleability-embed .code[data-theme='paper'] {
  border-color: var(--vp-c-brand-1);
  background: #f6f1e7;
  color: #3b2f1e;
}
.malleability-embed .code[data-theme='paper']::after {
  content: ' paper';
  font-size: 10px;
  opacity: 0.6;
}
.malleability-embed .frame,
.malleability-embed .fancy-frame {
  padding: 6px 8px;
  border-radius: 6px;
  color: var(--vp-c-text-2);
}
.malleability-embed .frame {
  border: 1px dashed var(--vp-c-divider);
}
.malleability-embed .fancy-frame {
  border: 2px solid var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  text-align: center;
}
</style>

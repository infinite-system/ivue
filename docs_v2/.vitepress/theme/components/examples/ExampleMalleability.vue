<script setup lang="ts">
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
      <div class="mal-live">
        <div class="mal-caption">Panel.vue, rendered with this entry</div>
        <!-- the seam: the entry's view, the entry as `kit`, the child's own props -->
        <component :is="demo.entry.view" :key="selectedId" :kit="demo.entry" :titles="demo.titles" />
      </div>
      <div class="mal-side">
        <div class="mal-caption">The override, as data</div>
        <pre class="mal-patch"><code>{{ demo.selected.patch }}</code></pre>
        <div class="mal-caption">The resolved kit, walked from the root</div>
        <ul class="mal-tree">
          <li v-for="line in demo.inspector" :key="line.key" :style="{ '--depth': line.depth }" :class="{ 'mal-derived': line.derived }">
            <span class="mal-role">{{ line.role }}</span>
            <span class="mal-view">{{ line.view }}</span>
            <span v-if="line.className" class="mal-class">{{ line.className }}</span>
            <span v-if="line.derived" class="mal-badge">derived</span>
            <span v-if="line.props" class="mal-props">{{ line.props }}</span>
          </li>
        </ul>
      </div>
    </div>
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
.mal-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.mal-tab {
  padding: 5px 11px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font: inherit;
  cursor: pointer;
}
.mal-tab-on {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
.mal-tagline {
  margin: 12px 0 14px;
  color: var(--vp-c-text-2);
}
.mal-stage {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
}
@media (max-width: 720px) {
  .mal-stage {
    grid-template-columns: minmax(0, 1fr);
  }
}
.mal-caption {
  margin: 0 0 8px;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}
.mal-caption + .mal-caption,
.mal-patch + .mal-caption {
  margin-top: 14px;
}
.mal-patch {
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
.mal-tree {
  list-style: none;
  margin: 0;
  padding: 0;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
}
.mal-tree li {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 3px 0 3px calc(var(--depth) * 16px);
  color: var(--vp-c-text-2);
}
.mal-role {
  color: var(--vp-c-text-1);
  font-weight: 600;
}
.mal-class::before {
  content: '·';
  margin-right: 8px;
  color: var(--vp-c-text-3);
}
.mal-derived .mal-class {
  color: var(--vp-c-brand-1);
}
.mal-badge {
  padding: 0 6px;
  border-radius: 999px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-size: 10px;
  line-height: 18px;
}
.mal-props {
  color: var(--vp-c-text-3);
}

/* the fixture tree's own classes — these files have no styles of their own */
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
  font-weight: 600;
  color: var(--vp-c-text-1);
}
.malleability-embed .fancy-head {
  color: var(--vp-c-brand-1);
  letter-spacing: 0.04em;
}
.malleability-embed .card-body,
.malleability-embed .grouped-body {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.malleability-embed .grouped-body {
  flex-direction: column;
}
.malleability-embed .code {
  margin: 0;
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--vp-code-block-bg);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  cursor: pointer;
}
.malleability-embed .code[data-theme='mono'] {
  background: #111;
  color: #e6e6e6;
}
.malleability-embed .code[data-theme='paper'] {
  background: #f6f1e7;
  color: #3b2f1e;
  border: 1px solid #e3d9c6;
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
  border: 1px solid var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}
</style>

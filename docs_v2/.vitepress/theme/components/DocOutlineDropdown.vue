<script setup lang="ts">
// Replaces VitePress's VPLocalNavOutlineDropdown (see the alias in config.ts).
import VPDocOutlineItem from 'vitepress/dist/client/theme-default/components/VPDocOutlineItem.vue';
import { DocOutlineDropdown } from './DocOutlineDropdown';

// inline on purpose: the SFC compiler resolves this literal, not a namespace type from another file
const props = defineProps<{
  headers: Array<{ title: string; link: string; children?: unknown[] }>;
  navHeight: number;
}>();

const dropdown = new DocOutlineDropdown.Class(props as DocOutlineDropdown.Props);

// the state destructure
const {
  // state refs
  open,
  // element refs
  main,
  items
} = dropdown;
</script>

<template>
  <div ref="main" class="VPLocalNavOutlineDropdown" :style="dropdown.heightStyle">
    <button v-if="dropdown.hasHeaders" :class="{ open }" @click="dropdown.onToggleClick()">
      <span class="menu-text">{{ dropdown.title }}</span>
      <span class="vpi-chevron-right icon" />
    </button>
    <button v-else @click="dropdown.onTopClick()">
      {{ dropdown.returnToTopLabel }}
    </button>
    <Transition name="flyout">
      <div v-if="open" ref="items" class="items" @click="dropdown.onItemsClick($event)">
        <div class="header">
          <a class="top-link" href="#" @click="dropdown.onTopClick()">
            {{ dropdown.returnToTopLabel }}
          </a>
        </div>
        <div class="outline">
          <VPDocOutlineItem :headers="headers" />
        </div>
        <nav v-if="dropdown.hasPager" class="pager" aria-label="More pages">
          <a v-if="dropdown.previous" class="pager-link prev" :href="dropdown.previous.href">
            <span class="desc">← {{ dropdown.previous.label }}</span>
            <span class="text">{{ dropdown.previous.text }}</span>
          </a>
          <a v-if="dropdown.next" class="pager-link next" :href="dropdown.next.href">
            <span class="desc">{{ dropdown.next.label }} →</span>
            <span class="text">{{ dropdown.next.text }}</span>
          </a>
        </nav>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* VitePress's own dropdown styles, kept as they are */
.VPLocalNavOutlineDropdown {
  padding: 12px 20px 11px;
}
@media (min-width: 960px) {
  .VPLocalNavOutlineDropdown {
    padding: 12px 36px 11px;
  }
}
.VPLocalNavOutlineDropdown button {
  display: block;
  font-size: 12px;
  font-weight: 500;
  line-height: 24px;
  color: var(--vp-c-text-2);
  transition: color 0.5s;
  position: relative;
}
.VPLocalNavOutlineDropdown button:hover {
  color: var(--vp-c-text-1);
  transition: color 0.25s;
}
.VPLocalNavOutlineDropdown button.open {
  color: var(--vp-c-text-1);
}
.icon {
  display: inline-block;
  vertical-align: middle;
  margin-left: 2px;
  font-size: 14px;
  transform: rotate(0);
  transition: transform 0.25s;
}
@media (min-width: 960px) {
  .VPLocalNavOutlineDropdown button {
    font-size: 14px;
  }
  .icon {
    font-size: 16px;
  }
}
.open > .icon {
  transform: rotate(90deg);
}
.items {
  position: absolute;
  top: 40px;
  right: 16px;
  left: 16px;
  display: grid;
  gap: 1px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background-color: var(--vp-c-gutter);
  max-height: calc(var(--vp-vh, 100vh) - 86px);
  overflow: hidden auto;
  box-shadow: var(--vp-shadow-3);
}
@media (min-width: 960px) {
  .items {
    right: auto;
    left: calc(var(--vp-sidebar-width) + 32px);
    width: 320px;
  }
}
.header {
  background-color: var(--vp-c-bg-soft);
}
.top-link {
  display: block;
  padding: 0 16px;
  line-height: 48px;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-brand-1);
}
.outline {
  padding: 8px 0;
  background-color: var(--vp-c-bg-soft);
}
/* the pager: previous and next side by side, the way the page footer shows them */
.pager {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 12px 16px 14px;
  background-color: var(--vp-c-bg-soft);
}
.pager-link {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 8px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  text-decoration: none;
}
.pager-link.next {
  grid-column: 2;
  text-align: right;
}
.pager-link:active,
.pager-link:hover {
  border-color: var(--vp-c-brand-1);
}
.desc {
  font-size: 11px;
  font-weight: 500;
  color: var(--vp-c-text-2);
}
.text {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.35;
  color: var(--vp-c-brand-1);
  overflow-wrap: anywhere;
}
.flyout-enter-active {
  transition: all 0.2s ease-out;
}
.flyout-leave-active {
  transition: all 0.15s ease-in;
}
.flyout-enter-from,
.flyout-leave-to {
  opacity: 0;
  transform: translateY(-16px);
}
</style>

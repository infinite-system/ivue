<script setup lang="ts">
import { ToolCallSections } from './ToolCall.Sections';

const props = defineProps<ToolCallSections.Props>();

const model = new (
  (props.kit?.namespace?.Class as typeof ToolCallSections.Class | undefined) ??
  ToolCallSections.Class
)(props);
</script>

<template>
  <div v-if="model.isExpanded" class="ac-tool-sections">
    <section
      v-for="(section, at) in model.sections"
      :key="model.keyOf(section, at)"
      class="ac-tool-section"
    >
      <h5>
        <span v-if="section.pathTitle" class="ac-path">{{ section.title }}</span>
        <template v-else>{{ section.title }}</template>
        <span v-for="tag in section.tags" :key="tag.text" class="ac-tag" :class="tag.class">{{
          tag.text
        }}</span>
      </h5>
      <component
        v-if="section.code"
        :is="model.viewOf(section)"
        v-bind="model.propsOf(section, at)"
      />
      <p v-else-if="section.note" class="ac-tool-caption ac-muted">{{ section.note }}</p>
    </section>
  </div>
</template>

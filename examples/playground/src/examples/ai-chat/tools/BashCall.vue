<script setup lang="ts">
import { BashCall } from './BashCall';
import type { ToolCallModel } from './ToolCallModel';
import ToolHead from './ToolHead.vue';
import ToolFoot from './ToolFoot.vue';
import CodeBlock from './CodeBlock.vue';

const props = defineProps<ToolCallModel.Props>();

const model = new BashCall.Class(props);
</script>

<template>
  <div class="ac-tool ac-tool-bash" :class="model.cardClass">
    <ToolHead :model="model" />
    <div v-if="model.isExpanded" class="ac-tool-body">
      <p v-if="model.description" class="ac-tool-caption">{{ model.description }}</p>
      <section class="ac-tool-section">
        <h5>command <span v-if="model.ranInBackground" class="ac-tag">background</span></h5>
        <CodeBlock :code="model.command" lang="bash" :cap="model.cap" wrap />
      </section>
      <section v-if="model.hasStdout" class="ac-tool-section">
        <h5>stdout <span class="ac-tag" :class="model.stateClass">{{ model.exitLabel }}</span></h5>
        <CodeBlock :code="model.stdout" lang="text" :cap="model.cap" wrap />
      </section>
      <section v-if="model.hasStderr" class="ac-tool-section">
        <h5>stderr</h5>
        <CodeBlock :code="model.stderr" lang="text" :cap="model.cap" tone="error" wrap />
      </section>
      <p v-if="model.hasNoOutput" class="ac-tool-caption ac-muted">no output · {{ model.exitLabel }}</p>
      <ToolFoot :model="model" />
    </div>
  </div>
</template>

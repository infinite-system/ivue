<script setup lang="ts">
import { BashCall } from './BashCall';
import type { ToolCallModel } from './ToolCallModel';

const props = defineProps<ToolCallModel.Props>();

const model = new ((props.kit?.namespace.Class as typeof BashCall.Class | undefined) ?? BashCall.Class)(props);
</script>

<template>
  <div class="ac-tool ac-tool-bash" :class="model.cardClass">
    <component :is="model.kit.Head.vue" :model="model" />
    <div v-if="model.isExpanded" class="ac-tool-body">
      <p v-if="model.description" class="ac-tool-caption">{{ model.description }}</p>
      <section class="ac-tool-section">
        <h5>command <span v-if="model.ranInBackground" class="ac-tag">background</span></h5>
        <component :is="model.kit.CodeBlock.vue" :kit="model.kit.CodeBlock" :code="model.commandText" lang="bash" :cap="model.cap" wrap />
      </section>
      <section v-if="model.hasStdout" class="ac-tool-section">
        <h5>stdout <span class="ac-tag" :class="model.stateClass">{{ model.exitLabel }}</span></h5>
        <component :is="model.kit.CodeBlock.vue" :kit="model.kit.CodeBlock" :code="model.stdout" lang="text" :cap="model.cap" wrap />
      </section>
      <section v-if="model.hasStderr" class="ac-tool-section">
        <h5>stderr</h5>
        <component :is="model.kit.CodeBlock.vue" :kit="model.kit.CodeBlock" :code="model.stderr" lang="text" :cap="model.cap" tone="error" wrap />
      </section>
      <p v-if="model.hasNoOutput" class="ac-tool-caption ac-muted">no output · {{ model.exitLabel }}</p>
      <component :is="model.kit.Foot.vue" :model="model" />
    </div>
  </div>
</template>

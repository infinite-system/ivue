<script setup lang="ts">
import { AgentCall } from './AgentCall';
import type { ToolCallModel } from './ToolCallModel';

const props = defineProps<ToolCallModel.Props>();

const model = new ((props.kit?.namespace.Class as typeof AgentCall.Class | undefined) ?? AgentCall.Class)(props);
</script>

<template>
  <div class="ac-tool ac-tool-agent" :class="model.cardClass">
    <component :is="model.kit.Head.vue" :model="model" />
    <div v-if="model.isExpanded" class="ac-tool-body">
      <p class="ac-tool-caption">
        <span class="ac-tag">{{ model.agentType }}</span>
        <span v-if="model.modelLabel" class="ac-tag">{{ model.modelLabel }}</span>
        {{ model.description }}
      </p>
      <section v-for="section in model.sections" :key="section.title" class="ac-tool-section">
        <h5>{{ section.title }}</h5>
        <component :is="model.kit.CodeBlock.vue" :kit="model.kit.CodeBlock" :code="section.code" :lang="section.lang" :cap="model.cap" :tone="section.tone" wrap />
      </section>
      <div v-if="model.hasThread" class="ac-tool-thread">
        <button type="button" class="ac-link" @click="model.toggleThread()">{{ model.threadLabel }}</button>
        <component :is="model.kit.SubThread.vue" :kit="model.kit.SubThread" v-if="model.isThreadOpen" :messages="model.thread" :chat="chat" />
      </div>
      <component :is="model.kit.Foot.vue" :model="model" />
    </div>
  </div>
</template>

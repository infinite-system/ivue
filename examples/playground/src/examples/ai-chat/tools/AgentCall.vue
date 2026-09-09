<script setup lang="ts">
import { AgentCall } from './AgentCall';
import type { ToolCallModel } from './ToolCallModel';
import ToolHead from './ToolHead.vue';
import ToolFoot from './ToolFoot.vue';
import CodeBlock from './CodeBlock.vue';
import SubThread from './SubThread.vue';

const props = defineProps<ToolCallModel.Props>();

const model = new AgentCall.Class(props);
</script>

<template>
  <div class="ac-tool ac-tool-agent" :class="model.cardClass">
    <ToolHead :model="model" />
    <div v-if="model.isExpanded" class="ac-tool-body">
      <p class="ac-tool-caption">
        <span class="ac-tag">{{ model.agentType }}</span>
        <span v-if="model.modelLabel" class="ac-tag">{{ model.modelLabel }}</span>
        {{ model.description }}
      </p>
      <section v-for="section in model.sections" :key="section.title" class="ac-tool-section">
        <h5>{{ section.title }}</h5>
        <CodeBlock :code="section.code" :lang="section.lang" :cap="model.cap" :tone="section.tone" wrap />
      </section>
      <div v-if="model.hasThread" class="ac-tool-thread">
        <button type="button" class="ac-link" @click="model.toggleThread()">{{ model.threadLabel }}</button>
        <SubThread v-if="model.isThreadOpen" :messages="model.thread" :chat="chat" />
      </div>
      <ToolFoot :model="model" />
    </div>
  </div>
</template>

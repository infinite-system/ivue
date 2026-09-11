<script setup lang="ts">
import type { SessionLog } from '../SessionLog';
import type { Part } from './Part';
import { AttachmentPart } from './AttachmentPart';

const props = defineProps<Part.Props<SessionLog.AttachmentPart>>();

const model = new (
  (props.kit?.namespace.Class as typeof AttachmentPart.Class | undefined) ?? AttachmentPart.Class
)(props);
</script>

<template>
  <figure v-if="model.isImage" class="ac-attachment-image" :style="model.imageStyle">
    <img
      :src="model.part.url"
      :alt="model.part.name"
      :width="model.part.width"
      :height="model.part.height"
    />
    <figcaption>{{ model.part.name }} · {{ model.sizeLabel }}</figcaption>
  </figure>
  <a v-else class="ac-attachment-file" :href="model.part.url" :download="model.part.name">
    <span class="ac-attachment-type">{{ model.typeLabel }}</span>
    <span class="ac-attachment-name">{{ model.part.name }}</span>
    <span class="ac-attachment-size">{{ model.sizeLabel }}</span>
  </a>
</template>

<script lang="ts" setup>
import EnvironmentService from '@/services/environment.service';

import { BlChooseFieldDefaultOption } from './DefaultOption.vue';

const props = defineProps<BlChooseFieldDefaultOption>();
</script>
<template>
  <div
    class="bl-project-layout-option no-wrap row q-py-xs items-center"
    :class="
      ['selected-item-chip', 'selected-item'].includes(mode)
        ? 'q-pr-xs'
        : 'q-px-xs'
    "
  >
    <div
      v-if="opt?.floorplan_media?.[0]?.key"
      style="display: flex; min-width: fit-content; overflow: hidden; border-radius: 3px"
    >
      <img
        :src="`${EnvironmentService.server}/media/file/${opt.floorplan_media[0].key}`"
        class="bl-project-layout-option__image"
      />
    </div>
    <div class="col q-ml-sm">
      <div class="q-gutter-x-xs items-center display-block" :class="!!params?.fetchEntity && ['view', 'list'].includes(mode) ? 'text-primary' : 'text-grey-10'">
        <div class="bl-project-layout-option__name">
          {{ opt?.name }}
        </div>
        <div
          class="text-condensed row wrap q-gutter-x-sm"
          style="font-size: 12px; padding-left: 4px; color: rgb(76, 86, 105)"
        >
          <span
            ><q-icon size="12px" name="sym_o_bed" /> {{ opt.bedrooms }}</span
          >
          <span
            ><q-icon size="12px" name="sym_o_shower" />
            {{ opt.bathrooms }}</span
          >
          <span> {{ opt.interior_size ? opt.interior_size + ' sf' : '' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
<style>
.bl-project-layout-option__image {
  object-fit: contain;
  max-width: 40px;
  max-height: 40px;
}

.bl-project-layout-option__name {
  height: 18px;
  line-height: 18px;
  font-weight: 500;
  margin-right: 5px;
}
</style>

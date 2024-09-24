<script lang="ts" setup>
import { computed } from 'vue';

import { IKeyValue } from '@/types/core';

import { type BlChooseFieldDefaultOption } from './DefaultOption.vue';
import { stringToColour } from '@/utils/color';
import { contactColorTrigger, contactLabel } from '@/utils/contact';

const props = withDefaults(
  defineProps<
    BlChooseFieldDefaultOption & {
      border?: boolean;
    }
  >(),
  {
    scope: {},
    border: false,
  }
);

const contactName = computed(() => {
  return contactLabel(props.opt as IKeyValue);
});

const color = computed(() => stringToColour(contactColorTrigger(props.opt)));

const component = computed(() => {
  return 'span';
});

</script>
<template>
  <div
    class="bl-contact"
    :class="{ 'bl-contact__bordered border-grey-3': border }"
  >
    <div class="row q-py-xs no-wrap q-pr-sm items-center">
      <template v-if="mode !== 'no-option'">
        <div
          class="bl-contact__avatar-container"
          :style="`border:1px solid ${color}; background: ${color};`"
        >
          {{ contactName?.[0] }}
        </div>
        <div class="col q-ml-sm">
          <div class="text-black row q-gutter-x-xs items-center">
            <div style="height: 18px; line-height: 18px">
              <component :is="component">
                {{ contactName ?? opt?.email ?? opt?.name ?? opt }}
              </component>
            </div>
            <div
              v-if="opt?.project_contact_type?.length"
              class="rounded-borders bg-grey-2 border-grey-5 q-px-xs text-black text-condensed text-uppercase self-center"
              style="font-size: 10px; line-height: 14px; font-weight: 500"
            >
              {{
                Array.isArray(opt?.project_contact_type)
                  ? opt?.project_contact_type.join(', ')
                  : opt?.project_contact_type
              }}
            </div>
          </div>
          <div
            v-if="
              opt?.email &&
              opt?.email !== contactName &&
              // Always hide this email if used as contact (currently used for any executor agreement signing)
              opt?.email !== 'executor@blacklineapp.com'
            "
            class="text-caption text-grey-8 q-mt-xs"
            style="margin-top: 2px; line-height: 10px"
          >
            {{ opt?.email }}
          </div>
        </div>
      </template>
      <template v-else>
        <div class="q-pa-md">No contacts found.</div>
      </template>
    </div>
  </div>
</template>
<style>
.bl-contact__bordered {
  border-radius: 50px;
  background: #fcfcfc;
  padding: 0px 8px 0px 4px;
}
.bl-contact__avatar-container {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50px;
  color: white;
  width: 32px;
  height: 32px;
  vertical-align: bottom;
  font-size: 16px;
  text-align: center;
}

a.bl-contact__link {
  display: inline-block;
  text-decoration: none;
  font-weight: 500;
  line-height: 14px;
  border-bottom: 1px solid transparent;
  color: #0f5070;
  transition: 0.3s;
}

a.bl-contact__link:hover {
  color: rgb(14, 79, 164);
  border-bottom: 1px dotted rgb(14, 79, 164);
}
</style>

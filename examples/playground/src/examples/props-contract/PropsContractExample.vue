<script lang="ts" setup>
import '../example-pane.css';
import Badge from './Badge.vue';
import IconBadge from './IconBadge.vue';
import { PropsContractExample } from './PropsContractExample';

const example = new PropsContractExample.Class();

// the state destructure
const {
  // state refs
  values,
} = example;
</script>

<template>
  <div class="pane pane-props">
    <p class="note">
      Nothing below is hand-listed. The knobs are read off
      <code>Badge.Class.propsTypes</code> and seeded from
      <code>Badge.Class.propsDefaults</code>; the ledger is the difference
      between Badge's contract and IconBadge's. Push size to 0 and the
      class's own validator says so — it is a value the panel can call.
    </p>

    <div class="knobs">
      <label v-for="control in example.controls" :key="control.name" class="knob" :class="{ 'knob--invalid': example.isInvalid(control) }">
        <span class="k">{{ control.name }}</span>
        <input
          v-if="example.isNumberControl(control)"
          type="number"
          class="knob__input"
          :value="example.numberValue(control)"
          @input="example.setNumber(control, $event)"
        />
        <input
          v-else-if="example.isBooleanControl(control)"
          type="checkbox"
          :checked="example.booleanValue(control)"
          @change="example.setBoolean(control, $event)"
        />
        <input
          v-else
          type="text"
          class="knob__input"
          :value="example.textValue(control)"
          @input="example.setText(control, $event)"
        />
        <span class="mono">{{ example.defaultLabel(control) }}</span>
      </label>
    </div>

    <div class="row" style="margin-bottom: 18px">
      <span class="mono" :class="{ invalid: example.hasInvalid }">{{ example.validityLabel }}</span>
      <button class="btn" type="button" @click="example.reset()">reset to defaults</button>
    </div>

    <div class="vals">
      <div>
        <div class="k">Badge · the knob values</div>
        <div class="stage"><Badge v-bind="values" /></div>
      </div>
      <div>
        <div class="k">IconBadge · same values, one prop added</div>
        <div class="stage"><IconBadge v-bind="values" /></div>
      </div>
      <div>
        <div class="k">IconBadge · its own defaults</div>
        <div class="stage"><IconBadge :label="values.label" /></div>
      </div>
    </div>

    <div class="receipt">
      <div>IconBadge extends Badge.$Class</div>
      <div>{{ example.inheritedLabel }} · {{ example.addedLabel }}</div>
      <div>re-tuned default — {{ example.retunedLabel }}</div>
    </div>
  </div>
</template>

<style scoped>
.pane-props {
  max-width: 720px;
}
.knobs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}
.knob {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(255, 255, 255, 0.03);
}
.knob--invalid {
  border-color: rgba(248, 113, 113, 0.6);
}
.knob__input {
  width: 100%;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  font-size: 13px;
}
.stage {
  min-height: 44px;
  display: flex;
  align-items: center;
}
.invalid {
  color: #fca5a5;
}
</style>

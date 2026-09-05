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
      <code>Badge.Class.propsTypes</code>, seeded from
      <code>Badge.Class.propsDefaults</code>, and their choices come from
      <code>Badge.Class.propsChoices</code>; the ledger is the difference
      between Badge's contract and IconBadge's. Pick size 0 and the
      class's own validator says so — it is a value the panel can call.
    </p>

    <div class="knobs">
      <div v-for="control in example.controls" :key="control.name" class="knob" :class="{ 'knob--invalid': example.isInvalid(control) }">
        <span class="k">{{ control.name }}</span>
        <span v-if="example.hasChoices(control)" class="choices">
          <button
            v-for="choice in control.choices"
            :key="choice"
            type="button"
            class="choice"
            :class="{ 'choice--active': example.isChosen(control, choice) }"
            @click="example.choose(control, choice)"
          >
            {{ choice }}
          </button>
        </span>
        <input
          v-else-if="example.isNumberControl(control)"
          type="number"
          class="knob__input"
          :value="example.numberValue(control)"
          @input="example.setNumber(control, $event)"
        />
        <label v-else-if="example.isBooleanControl(control)" class="switch">
          <input
            type="checkbox"
            :checked="example.booleanValue(control)"
            @change="example.setBoolean(control, $event)"
          />
          <span class="mono">on</span>
        </label>
        <input
          v-else
          type="text"
          class="knob__input"
          :value="example.textValue(control)"
          @input="example.setText(control, $event)"
        />
        <span class="mono">{{ example.defaultLabel(control) }}</span>
        <span class="mono current">{{ example.currentLabel(control) }}</span>
      </div>
    </div>

    <div class="row" style="margin-bottom: 18px">
      <span class="mono" :class="{ invalid: example.hasInvalid }">{{ example.validityLabel }}</span>
      <button class="btn" type="button" @click="example.reset()">reset to defaults</button>
    </div>

    <div class="stages">
      <div class="stage-card">
        <div class="k">Badge · the knob values</div>
        <div class="stage"><Badge v-bind="values" /></div>
      </div>
      <div class="stage-card">
        <div class="k">IconBadge · the knob values, plus its icon</div>
        <div class="stage"><IconBadge v-bind="values" /></div>
      </div>
      <div class="stage-card">
        <div class="k">Badge · its own defaults</div>
        <div class="stage"><Badge :label="values.label" /></div>
      </div>
      <div class="stage-card">
        <div class="k">IconBadge · its own defaults (size re-tuned to 16)</div>
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
  padding: 12px 18px 16px;
}
.pane-props .note {
  margin: 0 0 12px;
}
.pane-props .receipt {
  margin-bottom: 0;
  color: var(--vp-c-text-2, #b7c0dc);
  background: var(--vp-c-bg-alt, rgba(255, 255, 255, 0.03));
  border-color: var(--vp-c-divider, rgba(148, 163, 184, 0.16));
}
.stages {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}
.stage-card {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider, rgba(148, 163, 184, 0.16));
  background: var(--vp-c-bg-alt, rgba(255, 255, 255, 0.03));
}
.stages .k {
  white-space: normal;
  margin-bottom: 6px;
}
@media (max-width: 767px) {
  .stages,
  .knobs {
    grid-template-columns: 1fr;
  }
}
.knobs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}
.knob {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider, rgba(148, 163, 184, 0.16));
  background: var(--vp-c-bg-alt, rgba(255, 255, 255, 0.03));
}
.knob--invalid {
  border-color: rgba(248, 113, 113, 0.6);
}
.choices {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.choice {
  padding: 4px 9px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider, rgba(148, 163, 184, 0.25));
  background: var(--vp-c-bg, rgba(255, 255, 255, 0.04));
  color: var(--vp-c-text-2, #cbd5e1);
  font-size: 12px;
  cursor: pointer;
}
.choice:hover {
  border-color: #6366f1;
}
.choice--active {
  border-color: rgba(99, 102, 241, 0.7);
  background: rgba(99, 102, 241, 0.18);
  color: var(--vp-c-brand-1, #e0e7ff);
}
.current {
  align-self: flex-start;
  padding: 2px 7px;
  border-radius: 6px;
  background: rgba(99, 102, 241, 0.14);
  color: var(--vp-c-brand-1, #a5b4fc) !important;
  font-weight: 600;
}
.switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
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
  min-height: 40px;
  display: flex;
  align-items: center;
}
.invalid {
  color: var(--vp-c-danger-1, #fca5a5) !important;
}
</style>

<script setup lang="ts">
import ChooseField from './ChooseField.vue';
import ContactField from './ContactField.vue';
import { ChooseFieldExample } from './ChooseFieldExample';

const example = new ChooseFieldExample.Class();

// the state destructure
const {
  // state refs
  basicPick,
  iconPick,
  serverContact,
  clientContact,
  compactContact,
  teamPicks,
  tagPicks,
  variantPick,
  resetting,
} = example;
</script>

<template>
  <div class="pane pane-fields">
    <p class="note">
      One production-grade select component, eight configurations — every
      variation below is the SAME ChooseField class, driven entirely by
      props. Server search, pagination and option creation run against the
      in-browser mock backend (localStorage); point ServerApi at
      server-node/server.ts and nothing else changes.
    </p>

    <div class="field-grid">
      <section>
        <h3>Basic — static options</h3>
        <ChooseField
          v-model="basicPick"
          label="Plan"
          hint="Simple list, no server involved"
          :options="example.planOptions"
          clearable
        />
      </section>

      <section>
        <h3>Icons &amp; descriptions</h3>
        <ChooseField
          v-model="iconPick"
          label="Plan with details"
          hint="optionDescriptionPriority renders the caption line"
          :options="example.planOptions"
          icon="tune"
          clearable
        />
      </section>

      <section>
        <h3>Contact — search from the backend</h3>
        <ContactField
          v-model="serverContact"
          label="Assignee"
          hint="Debounced ILIKE search + pagination, server-side"
          fetch-path="/contact"
          fetch-search
          fetch-pagination
          use-input
          clearable
        />
      </section>

      <section>
        <h3>Contact — search via client JS</h3>
        <ContactField
          v-model="clientContact"
          label="Assignee (client filter)"
          hint="Whole list fetched once; typing filters in-memory"
          fetch-path="/contact"
          use-input
          clearable
        />
      </section>

      <section>
        <h3>Contact — compact</h3>
        <ContactField
          v-model="compactContact"
          label="Owner"
          hint="Smaller avatar, name only, denser rows"
          fetch-path="/contact"
          fetch-search
          use-input
          compact
          dense
          clearable
        />
      </section>

      <section>
        <h3>Multiple — avatar chips</h3>
        <ContactField
          v-model="teamPicks"
          label="Team"
          hint="multiple + useChips; remove from the chip"
          fetch-path="/contact"
          fetch-search
          use-input
          multiple
          use-chips
          round-chips
          clearable
        />
      </section>

      <section>
        <h3>Create new options</h3>
        <ChooseField
          v-model="tagPicks"
          label="Tags"
          hint="Type a new tag and create it — POSTs to the backend"
          fetch-path="/tag"
          create-path="/tag"
          create-label="Create tag"
          option-label="name"
          use-input
          multiple
          use-chips
          clearable
        />
      </section>

      <section>
        <h3>Variants — people / companies</h3>
        <ChooseField
          v-model="variantPick"
          label="Counterparty"
          hint="One field, two server-filtered datasets"
          fetch-path="/contact"
          fetch-search
          use-input
          :variants="example.variants"
          clearable
        />
      </section>
    </div>

    <div class="row" style="margin-top: 20px">
      <button
        class="btn"
        type="button"
        :disabled="resetting"
        @click="example.resetSandbox()"
      >
        {{ resetting ? 'Resetting…' : 'Reset sandbox data' }}
      </button>
      <span class="mono">
        your edits live in localStorage — private to this browser
      </span>
    </div>
  </div>
</template>

<style scoped src="../../example-pane.css"></style>

<style scoped>
.pane-fields {
  max-width: 920px;
}
.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 22px 26px;
}
.field-grid h3 {
  margin: 0 0 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #f1f5ff;
}
/* Quasar renders on a light-first palette; keep fields readable on the
   playground's dark shell. */
.pane-fields :deep(.q-field) {
  --q-primary: #6366f1;
}
</style>

<script setup lang="ts">
import { QDialog, QMenu, QSplitter, QTab, QTabs } from 'quasar';
import { PieceModel } from './PieceModel';
import ExpressionCard from './ExpressionCard.vue';

const model = new PieceModel.Class();
const {
  // state refs
  piece,
  loading,
  titleDraft,
  claimDraft,
  notesDraft,
  baseDraft,
  split,
  activeExpressionId,
  postings,
  baseRevisions,
  baseRevisionsOpen,
  adding,
} = model;
</script>

<template>
  <section class="view press press-piece" data-view="press-piece" @keydown="model.onKeydown($event)">
    <p v-if="loading && !piece" class="muted">Loading…</p>
    <p v-else-if="!piece" class="muted">No such piece.</p>

    <q-splitter v-else v-model="split" class="press-splitter" :limits="[26, 60]">
      <template #before>
        <div class="press-left">
          <header class="press-piece-head">
            <p class="press-eyebrow">{{ model.slugLabel }}</p>
            <input v-model="titleDraft" class="press-title-input" aria-label="Title" />
            <input v-model="claimDraft" class="press-claim-input" placeholder="The claim, in one line" aria-label="Claim" />
            <span class="press-save" :class="model.saveState.value">{{ model.saveLabel }}</span>
          </header>

          <img v-if="model.bannerUrl" class="press-banner" :src="'https://ivue.dev' + model.bannerUrl" alt="" />

          <div class="press-base">
            <div class="press-base-head">
              <h3>Base</h3>
              <span class="muted">every derived expression regenerates from this text; <code>---</code> marks a tweet break</span>
              <button class="ghost" type="button" @click="model.openBaseRevisions()">History</button>
            </div>
            <div class="press-base-body">
              <ol class="press-gutter" aria-label="Thread shape">
                <li v-for="entry in model.baseGutter" :key="entry.index" :class="{ over: entry.over }">
                  <span>{{ entry.index }}</span>
                  <span class="press-gutter-count">{{ entry.count }}</span>
                </li>
              </ol>
              <textarea
                v-model="baseDraft"
                class="press-base-editor"
                spellcheck="true"
                aria-label="Base text"
                placeholder="The argument. Split tweets with a line holding only ---"
              ></textarea>
            </div>
          </div>

          <label class="press-field">
            <span>Notes</span>
            <textarea v-model="notesDraft" rows="3" aria-label="Notes"></textarea>
          </label>

          <div v-if="postings.length" class="press-postings">
            <h3>Postings</h3>
            <ul>
              <li v-for="row in postings" :key="row.id">
                <span>{{ model.postingLabel(row) }}</span>
                <a v-if="row.url" :href="row.url" target="_blank" rel="noreferrer">{{ row.url }}</a>
              </li>
            </ul>
          </div>
        </div>
      </template>

      <template #after>
        <div class="press-right">
          <div class="press-tabs-row">
            <q-tabs
              v-model="activeExpressionId"
              dense
              no-caps
              align="left"
              class="press-tabs"
              active-color="secondary"
              indicator-color="secondary"
            >
              <q-tab
                v-for="expression in model.expressions"
                :key="expression.id"
                :name="expression.id"
                class="press-tab"
                @click="model.selectTab(expression.id)"
              >
                <span class="press-tab-dot" :class="model.tabTone(expression)"></span>
                <span class="press-tab-label">{{ model.tabLabel(expression) }}</span>
                <span class="press-tab-mode">{{ model.modeMark(expression) }}</span>
              </q-tab>
            </q-tabs>
            <button class="primary press-add" type="button" :disabled="adding">
              Add expression
              <q-menu auto-close class="press-menu">
                <ul class="press-menu-list">
                  <li v-for="entry in model.menu" :key="entry.kind">
                    <button type="button" @click="model.addExpression(entry)">
                      <span>{{ entry.label }}</span>
                      <span class="muted">{{ entry.modeLabel }}</span>
                    </button>
                  </li>
                </ul>
              </q-menu>
            </button>
          </div>

          <p v-if="!model.hasExpressions" class="press-empty muted">
            No expressions yet. The piece is valid as it is — add one when the
            argument is ready to go somewhere.
          </p>

          <ExpressionCard
            v-else-if="model.activeExpression"
            :key="model.activeExpression.id"
            :expression="model.activeExpression"
            :piece="piece"
            @changed="model.onExpressionChanged($event)"
            @removed="model.onExpressionArchived($event)"
          />
        </div>
      </template>
    </q-splitter>

    <q-dialog v-model="baseRevisionsOpen" class="admin-dialog">
      <aside class="dialog card">
        <header class="dialog-head">
          <h2>Base history</h2>
          <button class="ghost" @click="model.closeBaseRevisions()">Close</button>
        </header>
        <p v-if="!baseRevisions.length" class="muted">No earlier base yet.</p>
        <ol class="press-revisions">
          <li v-for="revision in baseRevisions" :key="revision.id">
            <div>
              <strong>{{ model.revisionLabel(revision) }}</strong>
              <p class="muted">{{ model.revisionExcerpt(revision) }}</p>
            </div>
            <button class="ghost" @click="model.restoreBase(revision)">Restore</button>
          </li>
        </ol>
      </aside>
    </q-dialog>
  </section>
</template>

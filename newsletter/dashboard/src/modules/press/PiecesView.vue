<script setup lang="ts">
import { QDialog, QSelect } from 'quasar';
import { PiecesModel } from './PiecesModel';

const model = new PiecesModel.Class();
const {
  // state refs
  rows,
  loading,
  search,
  statusFilter,
  kindFilter,
  waveFilter,
  newPieceOpen,
  newTitle,
  newFromSlug,
} = model;
</script>

<template>
  <section class="view press" data-view="press" tabindex="0" @keydown="model.onKeydown($event)">
    <div class="view-head">
      <h1>Pieces <span class="count">{{ model.count }}</span></h1>
      <form class="searchbar press-filters" @submit.prevent="model.searchNow()">
        <input
          v-model="search"
          type="search"
          placeholder="Search title, claim, slug…"
          aria-label="Search pieces"
        />
        <q-select
          v-model="statusFilter"
          :options="model.statusOptions"
          emit-value
          map-options
          dense
          outlined
          class="press-select"
          aria-label="Status"
          @update:model-value="model.load()"
        />
        <q-select
          v-model="kindFilter"
          :options="model.kindOptions"
          emit-value
          map-options
          dense
          outlined
          class="press-select"
          aria-label="Kind"
          @update:model-value="model.load()"
        />
        <q-select
          v-model="waveFilter"
          :options="model.waveOptions"
          emit-value
          map-options
          dense
          outlined
          class="press-select"
          aria-label="Wave"
          @update:model-value="model.load()"
        />
        <button class="primary" type="submit">Search</button>
        <button class="primary press-new" type="button" @click="model.openNewPiece()">
          New piece
        </button>
      </form>
    </div>

    <div class="table-scroll card">
      <table class="press-table">
        <thead>
          <tr>
            <th>Piece</th>
            <th>Wave</th>
            <th>Expressions</th>
            <th>Next due</th>
            <th>Calendar</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading && !rows.length">
            <td colspan="5" class="empty">Loading…</td>
          </tr>
          <tr v-else-if="model.isEmpty">
            <td colspan="5" class="empty">No pieces yet — start one from a blog post or blank.</td>
          </tr>
          <tr
            v-for="(piece, index) in rows"
            :key="piece.id"
            class="press-row"
            :class="{ focused: model.isFocused(index) }"
            @click="model.open(piece)"
          >
            <td>
              <div class="press-title">
                <strong>{{ piece.title }}</strong>
                <span v-if="piece.slug" class="muted press-slug">{{ piece.slug }}</span>
              </div>
            </td>
            <td>{{ model.waveLabel(piece) }}</td>
            <td>
              <span v-if="!model.hasExpressions(piece)" class="muted">— none yet</span>
              <span v-else class="press-strip">
                <span
                  v-for="state in piece.expressions"
                  :key="state.id"
                  class="press-badge"
                  :class="model.stateTone(state)"
                  :title="model.stateTitle(state)"
                >
                  {{ model.kindLabel(state) }}
                </span>
              </span>
            </td>
            <td class="muted">{{ model.nextDueLabel(piece) }}</td>
            <td class="muted">{{ model.calendarLabel(piece) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <q-dialog v-model="newPieceOpen" class="admin-dialog">
      <form class="dialog card press-new-dialog" @submit.prevent="model.createPiece()">
        <header class="dialog-head">
          <h2>New piece</h2>
          <button class="ghost" type="button" @click="model.closeNewPiece()">Close</button>
        </header>
        <label class="press-field">
          <span>Start from a blog post</span>
          <q-select
            v-model="newFromSlug"
            :options="model.blogPostOptions"
            emit-value
            map-options
            outlined
            dense
            use-input
            input-debounce="0"
            aria-label="Start from a blog post"
          />
        </label>
        <p class="muted press-hint">
          Starting from a post copies its title, description, banner, link and
          text into the base. The copy is yours to change; the site is not
          read again.
        </p>
        <label class="press-field">
          <span>Or a blank title</span>
          <input v-model="newTitle" placeholder="A voice post, a pitch, an argument…" aria-label="Title" />
        </label>
        <footer class="press-dialog-foot">
          <button class="primary" type="submit" :disabled="!model.canCreate">
            {{ model.createLabel }}
          </button>
        </footer>
      </form>
    </q-dialog>
  </section>
</template>

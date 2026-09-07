<script setup lang="ts">
import { SentModel } from './SentModel';

const model = new SentModel.Class();
const {
  // state refs
  filter,
} = model;
</script>

<template>
  <section class="view press" data-view="press-sent">
    <div class="view-head">
      <h1>Sent</h1>
      <form class="searchbar" @submit.prevent>
        <input v-model="filter" type="search" placeholder="Filter by piece, platform, venue…" aria-label="Filter the ledger" />
      </form>
    </div>

    <div class="table-scroll card">
      <table>
        <thead>
          <tr>
            <th>When</th>
            <th>Piece</th>
            <th>Kind</th>
            <th>Platform</th>
            <th>Venue</th>
            <th>Where</th>
            <th>Remote ids</th>
            <th>Posted</th>
            <th>Calendar</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="model.isLoadingEmpty">
            <td colspan="9" class="empty">Loading…</td>
          </tr>
          <tr v-else-if="model.isEmpty">
            <td colspan="9" class="empty">Nothing posted yet.</td>
          </tr>
          <tr v-for="row in model.filtered" :key="row.id">
            <td class="muted press-nowrap">{{ model.whenLabel(row) }}</td>
            <td>
              <button class="linklike" @click="model.openPiece(row)">{{ row.pieceTitle }}</button>
            </td>
            <td>{{ model.kindLabel(row) }}</td>
            <td>{{ model.platformLabel(row) }}</td>
            <td>{{ row.venue }}</td>
            <td class="press-excerpt">
              <a v-if="row.url" :href="row.url" target="_blank" rel="noreferrer">{{ row.url }}</a>
              <span v-else class="muted">—</span>
            </td>
            <td class="muted">{{ model.remoteLabel(row) }}</td>
            <td class="muted">{{ model.byLabel(row) }}</td>
            <td class="muted">{{ model.calendarLabel(row) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

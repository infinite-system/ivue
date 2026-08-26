<script setup lang="ts">
import { SendsModel } from './SendsModel';
import { AppStore } from '../app/AppStore';
import { Format } from '../platform/Format';

const app = AppStore.use();

const model = new SendsModel.Class();
const {
  // state refs
  rows,
  total,
  search,
  loading,
} = model;
</script>

<template>
  <section class="view" data-view="sends">
    <div class="view-head">
      <h1>Sent <span class="count">{{ total }}</span></h1>
      <form class="searchbar" @submit.prevent="model.searchNow()">
        <input
          v-model="search"
          type="search"
          placeholder="Filter by recipient or post…"
          aria-label="Search send log"
        />
        <button class="primary" type="submit">Search</button>
      </form>
    </div>

    <div class="table-scroll card">
      <table>
        <thead>
          <tr>
            <th>Sent</th>
            <th>Recipient</th>
            <th>Post</th>
          </tr>
        </thead>
        <tbody>
          <template v-if="loading">
            <tr v-for="placeholder in 5" :key="placeholder">
              <td colspan="3"><span class="skeleton"></span></td>
            </tr>
          </template>
          <tr v-else-if="!rows.length">
            <td colspan="3" class="empty">
              Nothing sent yet — the log fills as the drip, broadcasts, and
              targeted sends deliver.
            </td>
          </tr>
          <tr v-for="row in rows" v-else :key="model.rowKey(row)">
            <td>{{ Format.Class.dateTime(row.sentAt) }}</td>
            <td>
              <button class="linklike" @click="app.openSubscriber(row.email)">
                {{ row.email }}
              </button>
            </td>
            <td>
              <button
                class="linklike slug"
                @click="app.openEmailPreview(row.slug)"
              >
                {{ row.slug }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pager">
      <button :disabled="!model.hasPreviousPage" @click="model.previousPage()">
        ← Previous
      </button>
      <span class="muted">
        Page {{ model.pageIndex }} of {{ model.pageCount }}
      </span>
      <button :disabled="!model.hasNextPage" @click="model.nextPage()">
        Next →
      </button>
    </div>
  </section>
</template>

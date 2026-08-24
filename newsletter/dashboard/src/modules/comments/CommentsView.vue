<script setup lang="ts">
import { CommentsModel } from './CommentsModel';
import { Format } from '../platform/Format';

const model = new CommentsModel.Class();
const {
  // state refs
  rows,
  total,
  search,
  statusFilter,
  loading,
} = model;
</script>

<template>
  <section class="view" data-view="comments">
    <div class="view-head">
      <h1>
        Comments <span class="count">{{ total }}</span>
        <span v-if="model.pendingCount" class="status off">
          {{ model.pendingCount }} pending
        </span>
      </h1>
      <form class="searchbar" @submit.prevent="model.searchNow()">
        <input
          v-model="search"
          type="search"
          placeholder="Search slug, name, email, or text…"
          aria-label="Search comments"
        />
        <select
          v-model="statusFilter"
          aria-label="Filter by status"
          @change="model.filterByStatus(statusFilter)"
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
        </select>
        <button class="primary" type="submit">Search</button>
      </form>
    </div>

    <div class="table-scroll card">
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Post</th>
            <th>From</th>
            <th>Comment</th>
            <th>Submitted</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <template v-if="loading">
            <tr v-for="placeholder in 4" :key="placeholder">
              <td colspan="6"><span class="skeleton"></span></td>
            </tr>
          </template>
          <tr v-else-if="!rows.length">
            <td colspan="6" class="empty">
              No comments yet — they land here pending, and nothing shows on
              the site until approved.
            </td>
          </tr>
          <tr
            v-for="row in rows"
            v-else
            :key="row.id"
            :class="{ suppressed: row.status !== 'pending' }"
          >
            <td>
              <span
                class="status"
                :class="row.status === 'pending' ? 'off' : 'on'"
              >
                {{ model.statusLabel(row) }}
              </span>
            </td>
            <td>
              <a
                class="linklike slug"
                :href="model.postUrl(row.slug)"
                target="_blank"
                rel="noreferrer"
              >
                {{ row.slug }}
              </a>
            </td>
            <td>
              <div>{{ row.name }}</div>
              <div class="muted">{{ row.email }}</div>
            </td>
            <td class="comment-body">
              <div v-if="model.isReply(row)" class="muted">
                ↳ reply in thread #{{ row.rootId }}
              </div>
              <div v-if="row.locked" class="muted">🔒 thread locked</div>
              {{ row.body }}
            </td>
            <td>{{ Format.Class.dateTime(row.submittedAt) }}</td>
            <td class="list-actions">
              <button
                v-if="row.status === 'pending'"
                class="primary"
                :disabled="model.isBusy(row.id)"
                @click="model.approve(row)"
              >
                Approve
              </button>
              <button
                :disabled="model.isBusy(row.id)"
                :title="
                  row.locked
                    ? 'Reopen this thread to replies'
                    : 'Close this thread to new replies'
                "
                @click="model.toggleLock(row)"
              >
                {{ model.lockLabel(row) }}
              </button>
              <button
                class="danger"
                :disabled="model.isBusy(row.id)"
                @click="model.remove(row)"
              >
                Delete
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

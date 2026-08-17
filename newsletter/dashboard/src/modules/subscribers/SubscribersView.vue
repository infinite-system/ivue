<script setup lang="ts">
import { SubscribersModel } from './SubscribersModel';
import { Format } from '../platform/Format';
import type { AppModel } from '../app/AppModel';

const props = defineProps<{ app: AppModel.Instance }>();

const model = new SubscribersModel.Class(props.app);
const {
  // state refs
  rows,
  total,
  search,
  listFilter,
  lists,
  loading,
  selectedEmails,
  addEmail,
  addName,
  addList,
  // detail lens
  detail,
  detailLoading,
} = model;
</script>

<template>
  <section class="view" data-view="subscribers">
    <div class="view-head">
      <h1>Subscribers <span class="count">{{ total }}</span></h1>
      <form class="searchbar" @submit.prevent="model.searchNow()">
        <input
          v-model="search"
          type="search"
          placeholder="Search email or name…"
          aria-label="Search subscribers"
        />
        <select
          v-model="listFilter"
          aria-label="Filter by list"
          @change="model.filterByList(listFilter)"
        >
          <option value="">All lists</option>
          <option v-for="entry in lists" :key="entry.list" :value="entry.list">
            {{ entry.list }} ({{ entry.active }}/{{ entry.members }})
          </option>
        </select>
        <button class="primary" type="submit">Search</button>
      </form>
    </div>

    <div v-if="selectedEmails.length" class="bulkbar">
      <span>{{ model.selectionCount }} selected</span>
      <button @click="model.bulkUnsubscribe()">Unsubscribe</button>
      <button @click="model.bulkResubscribe()">Resubscribe</button>
      <button class="danger" @click="model.bulkRemove(false)">Remove</button>
      <button class="danger" @click="model.bulkRemove(true)">
        Remove + purge history
      </button>
    </div>

    <div class="table-scroll card">
      <table>
        <thead>
          <tr>
            <th class="check">
              <input
                type="checkbox"
                :checked="model.allOnPageSelected"
                aria-label="Select page"
                @change="model.toggleSelectPage()"
              />
            </th>
            <th>Email</th>
            <th>Name</th>
            <th>List</th>
            <th>Status</th>
            <th>Sent</th>
            <th>Last email</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="muted">Loading…</td>
          </tr>
          <tr v-else-if="!rows.length">
            <td colspan="8" class="muted">
              No subscribers match — clear the search or add one below.
            </td>
          </tr>
          <tr
            v-for="row in rows"
            v-else
            :key="row.email + row.list"
            :class="{ suppressed: row.unsubscribedAt }"
          >
            <td class="check">
              <input
                type="checkbox"
                :checked="model.isSelected(row.email)"
                :aria-label="`Select ${row.email}`"
                @change="model.toggleSelected(row.email)"
              />
            </td>
            <td>
              <button class="linklike" @click="model.openDetail(row.email)">
                {{ row.email }}
              </button>
            </td>
            <td>{{ row.name || '—' }}</td>
            <td><span class="pill">{{ row.list }}</span></td>
            <td>
              <span v-if="row.unsubscribedAt" class="status off">
                unsubscribed
              </span>
              <span v-else class="status on">active</span>
            </td>
            <td>{{ row.sendCount }}</td>
            <td>{{ Format.Class.date(row.lastSentAt) }}</td>
            <td>{{ Format.Class.date(row.subscribedAt) }}</td>
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

    <form class="addbar card" @submit.prevent="model.addSubscriber()">
      <h2>Add subscriber</h2>
      <div class="addbar-fields">
        <input
          v-model="addEmail"
          type="email"
          placeholder="email@example.com"
          aria-label="New subscriber email"
          required
        />
        <input v-model="addName" placeholder="Name (optional)" aria-label="Name" />
        <input v-model="addList" placeholder="list" aria-label="List" />
        <button class="primary" type="submit">Add</button>
      </div>
    </form>

    <div v-if="detail || detailLoading" class="drawer-backdrop" @click.self="model.closeDetail()">
      <aside class="drawer card" aria-label="Subscriber detail">
        <p v-if="detailLoading" class="muted">Loading…</p>
        <template v-else-if="detail">
          <header class="drawer-head">
            <h2>{{ detail.email }}</h2>
            <button class="ghost" @click="model.closeDetail()">Close</button>
          </header>
          <h3>Lists</h3>
          <ul class="memberships">
            <li v-for="membership in detail.memberships" :key="membership.list">
              <span class="pill">{{ membership.list }}</span>
              <span v-if="membership.unsubscribedAt" class="status off">
                unsubscribed {{ Format.Class.date(membership.unsubscribedAt) }}
              </span>
              <span v-else class="status on">active</span>
              <span class="muted">
                joined {{ Format.Class.date(membership.subscribedAt) }}
              </span>
            </li>
          </ul>
          <h3>Emails received ({{ detail.history.length }})</h3>
          <p v-if="!detail.history.length" class="muted">Nothing sent yet.</p>
          <ol class="history">
            <li v-for="sent in detail.history" :key="sent.slug">
              <span class="slug">{{ sent.slug }}</span>
              <span class="muted">{{ Format.Class.dateTime(sent.sentAt) }}</span>
            </li>
          </ol>
        </template>
      </aside>
    </div>
  </section>
</template>

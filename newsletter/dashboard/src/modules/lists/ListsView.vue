<script setup lang="ts">
import { ListsModel } from './ListsModel';
import { AppStore } from '../app/AppStore';

const app = AppStore.use();

const model = new ListsModel.Class();
const {
  // state refs
  lists,
  loading,
  createDraft,
  renameDraft,
} = model;
</script>

<template>
  <section class="view" data-view="lists">
    <form class="addbar card" @submit.prevent="model.createList()">
      <h2>Create list</h2>
      <div class="addbar-fields">
        <input
          v-model="createDraft"
          placeholder="list-name (lowercase, dashes)"
          aria-label="New list name"
          required
        />
        <button class="primary" type="submit" :disabled="model.createDisabled">
          Create
        </button>
      </div>
    </form>

    <div class="view-head">
      <h1>Lists <span class="count">{{ lists.length }}</span></h1>
    </div>

    <div class="table-scroll card">
      <table>
        <thead>
          <tr>
            <th>List</th>
            <th>Members</th>
            <th>Active</th>
            <th>Drip schedule</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <template v-if="loading">
            <tr v-for="placeholder in 3" :key="placeholder">
              <td colspan="5"><span class="skeleton"></span></td>
            </tr>
          </template>
          <tr v-for="entry in lists" v-else :key="entry.list">
            <td>
              <form
                v-if="model.isRenaming(entry.list)"
                class="rename-form"
                @submit.prevent="model.confirmRename()"
              >
                <input
                  v-model="renameDraft"
                  :aria-label="`New name for ${entry.list}`"
                />
                <button
                  class="primary"
                  type="submit"
                  :disabled="model.renameDisabled"
                >
                  Save
                </button>
                <button class="ghost" type="button" @click="model.cancelRename()">
                  Cancel
                </button>
              </form>
              <template v-else>
                <span class="pill">{{ entry.list }}</span>
                <span v-if="model.isDefault(entry.list)" class="status on">
                  default
                </span>
              </template>
            </td>
            <td>{{ entry.members }}</td>
            <td>{{ entry.active }}</td>
            <td class="muted">{{ model.scheduleLabel(entry.list) }}</td>
            <td class="list-actions">
              <button
                v-if="!model.isDefault(entry.list)"
                class="ghost"
                @click="model.startRename(entry.list)"
              >
                Rename
              </button>
              <button
                v-if="model.canDelete(entry)"
                class="danger"
                @click="model.deleteList(entry.list)"
              >
                Delete
              </button>
              <span v-else-if="model.deleteHint(entry)" class="muted">
                {{ model.deleteHint(entry) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="muted">
      Per-list cadence and send-hour overrides live in
      <button class="linklike" @click="app.open('newsletter-settings')">
        Settings
      </button>
      — blank inherits the defaults. Deleting needs an empty list; move or
      remove members first.
    </p>
  </section>
</template>

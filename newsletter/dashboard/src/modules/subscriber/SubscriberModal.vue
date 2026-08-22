<script setup lang="ts">
import { SubscriberModel } from './SubscriberModel';
import { Format } from '../platform/Format';

const model = new SubscriberModel.Class();
const {
  // state refs
  detail,
  loading,
} = model;
</script>

<template>
  <div
    v-if="model.isOpen"
    class="dialog-backdrop"
    @click.self="model.close()"
  >
    <aside class="dialog card" aria-label="Subscriber detail">
      <header class="dialog-head">
        <div>
          <h2>{{ model.email }}</h2>
          <p v-if="model.displayName" class="muted">{{ model.displayName }}</p>
        </div>
        <button class="ghost" @click="model.close()">Close</button>
      </header>

      <p v-if="loading" class="muted">Loading…</p>

      <template v-else-if="detail">
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
            <span class="muted">
              {{ membership.timezone ?? `${detail.defaultTimezone} (default)` }}
            </span>
          </li>
        </ul>

        <nav class="dialog-tabs" aria-label="Subscriber emails">
          <button
            v-for="tab in model.TABS"
            :key="tab.name"
            class="dialog-tab"
            :class="{ active: model.isTabOpen(tab.name) }"
            :data-subscriber-tab="tab.name"
            @click="model.openTab(tab.name)"
          >
            {{ model.tabLabel(tab.name) }}
          </button>
        </nav>

        <section v-if="model.isTabOpen('sent')" class="dialog-pane">
          <p v-if="!detail.history.length" class="muted">Nothing sent yet.</p>
          <ol class="history">
            <li v-for="sent in detail.history" :key="sent.slug">
              <button
                class="linklike slug"
                @click="model.openPost(sent.slug)"
              >
                {{ sent.slug }}
              </button>
              <span class="muted">{{ Format.Class.dateTime(sent.sentAt) }}</span>
            </li>
          </ol>
        </section>

        <section v-else class="dialog-pane">
          <p v-if="model.cadenceLabel" class="muted cadence-note">
            one email {{ model.cadenceLabel }}
          </p>
          <p v-if="model.isSuppressed" class="pipeline-paused" role="status">
            Pipeline paused — this address is unsubscribed. Resubscribing
            resumes right where it left off.
          </p>
          <p v-if="model.isFullyCaughtUp" class="muted">
            All caught up — every post in the archive has been sent.
          </p>
          <ol v-else class="pipeline">
            <li
              v-for="(entry, position) in model.upcoming"
              :key="entry.slug"
              :class="{ next: position === 0 }"
            >
              <span v-if="position === 0" class="status on">next</span>
              <span v-else class="pipeline-position">{{ position + 1 }}</span>
              <button
                class="linklike slug"
                @click="model.openPost(entry.slug)"
              >
                {{ entry.slug }}
              </button>
              <span class="muted">
                {{ Format.Class.dateTime(entry.projectedAt) }}
                ({{ Format.Class.relativeDue(entry.projectedAt) }})
              </span>
            </li>
          </ol>
        </section>
      </template>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ReleaseCalendarModel } from './ReleaseCalendarModel';

const model = new ReleaseCalendarModel.Class();
</script>

<template>
  <section class="view release" data-view="release-venues">
    <div class="view-head">
      <h1>Venues</h1>
      <p class="muted">
        Where the plan has landed so far — one row per venue, one per
        article. Posted counts come from the calendar's checkmarks.
      </p>
    </div>

    <div class="statline">
      <span class="stat">
        <strong>{{ model.totalDoneCount }}</strong> / {{ model.totalCount }}
        posted overall
      </span>
    </div>

    <div class="table-scroll card">
      <table>
        <thead>
          <tr>
            <th>Venue</th>
            <th>Channel</th>
            <th>Posted</th>
            <th>Planned</th>
            <th>Articles posted there</th>
            <th>Last posted</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!model.venueStats.length">
            <td colspan="6" class="empty">No plan entries yet.</td>
          </tr>
          <tr v-for="stat in model.venueStats" :key="stat.venue">
            <td>
              <a :href="stat.url" target="_blank" rel="noreferrer">
                {{ stat.venue }}
              </a>
            </td>
            <td>{{ model.channelLabel(stat.channel) }}</td>
            <td>
              <strong>{{ stat.posted }}</strong>
            </td>
            <td>{{ stat.planned }}</td>
            <td class="release-articles">
              {{ model.listLabel(stat.articles) }}
            </td>
            <td>{{ model.orDash(stat.lastPosted) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="table-scroll card">
      <table>
        <thead>
          <tr>
            <th>Article</th>
            <th>Posted</th>
            <th>Planned</th>
            <th>Venues it went to</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!model.articleStats.length">
            <td colspan="4" class="empty">No plan entries yet.</td>
          </tr>
          <tr v-for="stat in model.articleStats" :key="stat.article">
            <td>{{ stat.article }}</td>
            <td>
              <strong>{{ stat.posted }}</strong>
            </td>
            <td>{{ stat.planned }}</td>
            <td class="release-articles">
              {{ model.listLabel(stat.venues) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

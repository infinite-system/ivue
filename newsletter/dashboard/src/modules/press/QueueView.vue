<script setup lang="ts">
import { QueueModel } from './QueueModel';

const model = new QueueModel.Class();
const {
  // state refs
  loading,
} = model;
</script>

<template>
  <section class="view press" data-view="press-queue">
    <div class="view-head">
      <h1>Queue</h1>
      <p class="muted">
        What is scheduled, soonest first. A platform without an API comes
        due here: copy the text, post it by hand, mark it sent.
      </p>
    </div>

    <div v-if="model.due.length" class="card press-due">
      <h2>Due — post by hand</h2>
      <article v-for="expression in model.due" :key="expression.id" class="press-due-item">
        <div class="press-due-head">
          <strong>{{ expression.pieceTitle }}</strong>
          <span class="press-badge state-due">{{ expression.kind }}</span>
          <span v-if="expression.venue" class="muted">{{ expression.venue }}</span>
        </div>
        <pre class="press-plain">{{ model.textOf(expression) }}</pre>
        <div class="press-actions">
          <button class="ghost" @click="model.copy(expression)">{{ model.copyLabel(expression) }}</button>
          <button class="primary" @click="model.markSent(expression)">Mark sent</button>
          <button class="ghost" @click="model.openPiece(expression)">Open piece</button>
        </div>
      </article>
    </div>

    <div class="table-scroll card">
      <h2>Upcoming</h2>
      <table>
        <thead>
          <tr>
            <th>Due</th>
            <th>What</th>
            <th>Text</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading && !model.upcoming.length">
            <td colspan="4" class="empty">Loading…</td>
          </tr>
          <tr v-else-if="!model.upcoming.length">
            <td colspan="4" class="empty">Nothing scheduled.</td>
          </tr>
          <tr v-for="job in model.upcoming" :key="job.id">
            <td class="muted press-nowrap">{{ model.dueLabel(job.dueAt) }}</td>
            <td>{{ model.jobLabel(job) }}</td>
            <td class="press-excerpt">{{ model.jobText(job) }}</td>
            <td class="press-nowrap">
              <button v-if="job.expression" class="ghost" @click="model.openPiece(job.expression)">Open</button>
              <button class="ghost danger" @click="model.cancel(job)">Cancel</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="table-scroll card">
      <h2>Recent executions</h2>
      <table>
        <thead>
          <tr>
            <th>Ran</th>
            <th>Kind</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!model.recent.length">
            <td colspan="3" class="empty">Nothing has run yet.</td>
          </tr>
          <tr v-for="job in model.recent" :key="job.id">
            <td class="muted press-nowrap">{{ model.dueLabel(job.executedAt ?? job.dueAt) }}</td>
            <td>{{ job.kind }}</td>
            <td>{{ model.resultLabel(job) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

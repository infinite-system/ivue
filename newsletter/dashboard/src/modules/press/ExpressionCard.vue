<script setup lang="ts">
import { QDialog, QSelect } from 'quasar';
import type { PressExpression, PressPieceRecord } from '../platform/Api';
import { ExpressionModel } from './ExpressionModel';
import XThreadFrame from './XThreadFrame.vue';
import XPostFrame from './XPostFrame.vue';
import LinkedInFrame from './LinkedInFrame.vue';
import RedditFrame from './RedditFrame.vue';
import DevtoFrame from './DevtoFrame.vue';
import ArticleFrame from './ArticleFrame.vue';
import HnFrame from './HnFrame.vue';
import EmailFrame from './EmailFrame.vue';
import CardsFrame from './CardsFrame.vue';
import PlainFrame from './PlainFrame.vue';

const props = defineProps<{ expression: PressExpression; piece: PressPieceRecord }>();
const emit = defineEmits<{ changed: [record: PressExpression]; removed: [id: number] }>();

const model = new ExpressionModel.Class(props, emit as ExpressionModel.Emits);
const {
  // state refs
  lintProblems,
  scheduleOpen,
  scheduleAt,
  sentOpen,
  sentUrl,
  sentPlatform,
  sentVenue,
  revisions,
  revisionsOpen,
  cloneOpen,
  busy,
} = model;
</script>

<template>
  <article class="press-card" :data-kind="model.kind" @keydown="model.onKeydown($event)">
    <header class="press-card-head">
      <div class="press-card-title">
        <span class="press-badge" :class="model.statusTone">{{ model.statusLabel }}</span>
        <strong>{{ model.kindLabel }}</strong>
        <span v-if="expression.venue" class="muted">{{ expression.venue }}</span>
        <span class="press-mode-pill">{{ model.modeLabel }}</span>
        <span v-if="model.scheduledLabel" class="muted">· {{ model.scheduledLabel }}</span>
        <span v-if="model.sentLabel" class="muted">· {{ model.sentLabel }}</span>
      </div>
      <span class="press-save" :class="model.saveState.value">{{ model.saveLabel }}</span>
    </header>

    <p v-if="model.unapprovedBecause && model.canApprove" class="press-notice">
      Returned to draft: {{ model.unapprovedBecause }}. Approve the text again once it reads right.
    </p>
    <p v-if="model.isDerived" class="press-notice press-notice--derived">
      This text is derived from the base — edit the base on the left, or detach it to rewrite by hand.
    </p>

    <div class="press-frame">
      <XThreadFrame v-if="model.frame === 'x-thread'" :model="model" />
      <XPostFrame v-else-if="model.frame === 'x-post'" :model="model" />
      <LinkedInFrame v-else-if="model.frame === 'linkedin'" :model="model" />
      <RedditFrame v-else-if="model.frame === 'reddit'" :model="model" />
      <DevtoFrame v-else-if="model.frame === 'devto'" :model="model" />
      <ArticleFrame v-else-if="model.frame === 'article'" :model="model" />
      <HnFrame v-else-if="model.frame === 'hn'" :model="model" />
      <EmailFrame v-else-if="model.frame === 'email'" :model="model" />
      <CardsFrame v-else-if="model.frame === 'cards'" :model="model" />
      <PlainFrame v-else :model="model" />
    </div>

    <ul v-if="model.hasMirrors" class="press-mirrors" aria-label="Mirrors">
      <li v-for="entry in model.mirrors" :key="entry.mirror.platform" :class="{ over: entry.over }">
        <strong>{{ entry.label }}</strong>
        <span>{{ entry.count }}<template v-if="entry.limit"> / {{ entry.limit }}</template></span>
        <span class="muted">{{ entry.sentLabel }}</span>
        <button v-if="!entry.mirror.sentAt" class="ghost" type="button" @click="model.openSent(entry.mirror.platform)">Mark sent</button>
      </li>
    </ul>

    <ul v-if="model.hasLintProblems" class="press-lint" role="alert">
      <li v-for="problem in lintProblems" :key="problem">{{ problem }}</li>
    </ul>

    <footer class="press-card-foot">
      <div class="press-foot-group">
        <button v-if="model.canApprove" class="primary" type="button" :disabled="busy" @click="model.approve()">
          {{ model.approveLabel }}
        </button>
        <button v-else-if="model.canUnapprove" class="ghost press-approved" type="button" :disabled="busy" @click="model.unapprove()">
          Approved ✓ — unapprove
        </button>
        <button v-if="model.canSchedule || model.canReschedule" class="ghost" type="button" @click="model.openSchedule()">
          {{ model.canReschedule ? 'Reschedule' : 'Schedule' }}
        </button>
        <button v-if="model.canCancel" class="ghost" type="button" @click="model.cancelSchedule()">Cancel schedule</button>
        <button v-if="model.canPost" class="primary" type="button" :disabled="busy" @click="model.post()">Post to X now</button>
        <button v-if="model.canMarkSent" class="ghost" type="button" @click="model.openSent()">Mark sent</button>
      </div>
      <div class="press-foot-group">
        <button class="ghost" type="button" :class="{ copied: model.isCopied('all') }" @click="model.copyAll()">
          {{ model.copyLabel('all') }}
        </button>
        <button v-if="model.canDetach" class="ghost" type="button" @click="model.detach()">Detach</button>
        <button class="ghost" type="button" @click="model.openClone()">Clone as…</button>
        <button class="ghost" type="button" @click="model.openRevisions()">History</button>
        <button class="ghost danger" type="button" @click="model.archive()">Archive</button>
      </div>
    </footer>

    <q-dialog v-model="scheduleOpen" class="admin-dialog">
      <form class="dialog card press-small-dialog" @submit.prevent="model.schedule()">
        <header class="dialog-head">
          <h2>Schedule</h2>
          <button class="ghost" type="button" @click="model.closeSchedule()">Close</button>
        </header>
        <label class="press-field">
          <span>When (your zone)</span>
          <input v-model="scheduleAt" type="datetime-local" aria-label="When" required />
        </label>
        <p class="muted">{{ model.scheduleEasternPreview }}</p>
        <p class="muted press-hint">
          The exact approved text ships. An edit after scheduling cancels the job and returns the text to draft.
        </p>
        <footer class="press-dialog-foot">
          <button class="primary" type="submit">{{ model.canReschedule ? 'Move it' : 'Schedule' }}</button>
        </footer>
      </form>
    </q-dialog>

    <q-dialog v-model="sentOpen" class="admin-dialog">
      <form class="dialog card press-small-dialog" @submit.prevent="model.markSent()">
        <header class="dialog-head">
          <h2>Mark sent</h2>
          <button class="ghost" type="button" @click="model.closeSent()">Close</button>
        </header>
        <label class="press-field">
          <span>Platform</span>
          <q-select v-model="sentPlatform" :options="model.sentPlatformOptions" emit-value map-options dense outlined />
        </label>
        <label class="press-field">
          <span>Venue</span>
          <input v-model="sentVenue" placeholder="r/vuejs, a newsletter, a Discord…" aria-label="Venue" />
        </label>
        <label class="press-field">
          <span>Where it lives (URL, optional)</span>
          <input v-model="sentUrl" type="url" placeholder="https://…" aria-label="URL" />
        </label>
        <footer class="press-dialog-foot">
          <button class="primary" type="submit">Record the posting</button>
        </footer>
      </form>
    </q-dialog>

    <q-dialog v-model="cloneOpen" class="admin-dialog">
      <aside class="dialog card press-small-dialog">
        <header class="dialog-head">
          <h2>Clone as</h2>
          <button class="ghost" type="button" @click="model.closeClone()">Close</button>
        </header>
        <ul class="press-menu-list">
          <li v-for="option in model.cloneOptions" :key="option.value">
            <button type="button" @click="model.clone(option.value)">{{ option.label }}</button>
          </li>
        </ul>
      </aside>
    </q-dialog>

    <q-dialog v-model="revisionsOpen" class="admin-dialog">
      <aside class="dialog card">
        <header class="dialog-head">
          <h2>History</h2>
          <button class="ghost" type="button" @click="model.closeRevisions()">Close</button>
        </header>
        <p v-if="!revisions.length" class="muted">No earlier text yet.</p>
        <ol class="press-revisions">
          <li v-for="revision in revisions" :key="revision.id">
            <div>
              <strong>{{ model.revisionLabel(revision) }}</strong>
              <p class="muted">{{ model.revisionExcerpt(revision) }}</p>
            </div>
            <button class="ghost" type="button" @click="model.restore(revision)">Restore</button>
          </li>
        </ol>
      </aside>
    </q-dialog>
  </article>
</template>

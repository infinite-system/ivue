<script setup lang="ts">
import { ExtensibleKernelExample } from './ExtensibleKernelExample';

const example = new ExtensibleKernelExample.Class();

const {
  // state refs
  activityLog,
  graph,
} = example;
</script>

<template>
  <div class="pane pane-wide">
    <section aria-labelledby="toast-heading">
      <div class="kx-demo-head">
        <div>
          <span class="kx-eyebrow">Live application</span>
          <h2 id="toast-heading">Toast playground</h2>
        </div>
        <div class="row kx-actions">
          <button
            class="btn primary"
            type="button"
            @click="example.addNotification('notification')"
          >
            Show saved toast
          </button>
          <button
            class="btn"
            type="button"
            @click="example.addNotification('error')"
          >
            Show error toast
          </button>
        </div>
      </div>

      <div class="kx-app-stage">
        <div class="kx-app-chrome">
          <span></span><span></span><span></span>
          <strong>Acme workspace</strong>
        </div>
        <div class="kx-app-canvas">
          <div class="kx-page-copy">
            <span></span><span></span><span></span>
          </div>

          <div class="kx-toast-region" aria-live="polite">
            <article
              v-for="entry in example.visibleNotifications"
              :key="entry.id"
              class="kx-toast"
              :style="{ '--toast-accent': entry.notification.accent }"
            >
              <div class="kx-toast__icon">{{ entry.notification.icon }}</div>
              <div class="kx-toast__body">
                <div class="kx-toast__title-row">
                  <strong>{{ entry.notification.kind }}</strong>
                  <span v-if="entry.notification.isPinned" class="kx-pin">
                    Sticky Plugin · pinned
                  </span>
                </div>
                <p>{{ entry.notification.message }}</p>
                <div class="kx-toast__lifetime">
                  <span>{{ entry.notification.lifetimeLabel }}</span>
                  <span v-if="example.isActivityActive" class="kx-tracked">
                    Activity Plugin recorded SHOW
                  </span>
                </div>
                <div
                  v-if="entry.notification.shouldShowCountdown"
                  class="kx-progress"
                  aria-hidden="true"
                >
                  <span
                    :style="{ width: entry.notification.lifetimeWidth }"
                  ></span>
                </div>
              </div>
              <button
                class="kx-toast__dismiss"
                type="button"
                aria-label="Dismiss toast"
                @click="example.dismissNotification(entry)"
              >
                ×
              </button>
            </article>

            <div v-if="!example.hasVisibleNotifications" class="kx-empty">
              No active toasts. Trigger one above.
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="kx-modifiers" aria-labelledby="plugin-heading">
      <div class="kx-modifiers__head">
        <div>
          <span class="kx-eyebrow">Kernel controls</span>
          <h3 id="plugin-heading">Enable plugins for every toast class</h3>
        </div>
        <p>Toggle a plugin and watch the live toasts above change immediately.</p>
      </div>

      <div class="kx-plugin-grid">
        <button
          v-for="plugin in example.plugins"
          :key="plugin.id"
          type="button"
          class="kx-plugin"
          :class="{ 'kx-plugin--active': example.isPluginActive(plugin.id) }"
          :aria-pressed="example.isPluginActive(plugin.id)"
          @click="example.togglePlugin(plugin.id)"
        >
          <span class="kx-plugin__top">
            <strong>{{ plugin.label }}</strong>
            <span class="kx-switch">{{ example.pluginState(plugin.id) }}</span>
          </span>
          <span class="kx-plugin__description">{{ plugin.description }}</span>
          <span class="kx-plugin__effect">
            <span v-if="example.isPluginActive(plugin.id)">Applied now:</span>
            <span v-else>When enabled:</span>
            {{ plugin.enabledEffect }}
          </span>
        </button>
      </div>
    </section>

    <section class="kx-output" aria-labelledby="activity-heading">
      <div class="kx-output__head">
        <div>
          <span class="kx-output__label">Activity Plugin output</span>
          <h3 id="activity-heading">SHOW event stream</h3>
        </div>
        <span
          class="kx-output__state"
          :class="{ 'kx-output__state--active': example.isActivityActive }"
        >
          Activity Plugin {{ example.pluginState('activity') }}
        </span>
      </div>
      <ol v-if="example.hasActivityEvents" class="kx-events mono">
        <li v-for="(event, eventIndex) in activityLog" :key="eventIndex">
          {{ event }}
        </li>
      </ol>
      <p v-else class="kx-output__empty mono">
        No events. Enable Activity Plugin, then show a toast.
      </p>
    </section>

    <details class="kx-under-hood">
      <summary>Under the hood: sealed class graph</summary>
      <div class="kx-graph">
        <div v-for="node in graph" :key="node.name" class="kx-graph__row mono">
          <strong>{{ node.name }}</strong>
          <span v-if="example.graphNodeHasParent(node)" class="kx-graph__dim">
            extends {{ node.extends }}
          </span>
          <span v-if="example.graphNodeHasPlugins(node)" class="kx-graph__plugins">
            ◂ {{ node.plugins.join(' ◂ ') }}
          </span>
        </div>
      </div>
    </details>
  </div>
</template>

<style scoped src="../example-pane.css"></style>

<style scoped>
.pane-wide {
  max-width: 800px;
}
.kx-demo-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}
.kx-demo-head h2,
.kx-modifiers h3 {
  margin: 3px 0 0;
  color: var(--vp-c-text-1);
}
.kx-demo-head h2 {
  font-size: 21px;
}
.kx-intro {
  margin-bottom: 24px;
}
.kx-eyebrow,
.kx-output__label {
  color: #818cf8;
  font-size: 10.5px;
  font-weight: 750;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}
.kx-intro h2,
.kx-step h3,
.kx-output h3 {
  margin: 0;
  color: var(--vp-c-text-1);
}
.kx-intro h2 {
  margin-top: 4px;
  font-size: 21px;
}
.kx-intro p,
.kx-step p {
  margin: 5px 0 0;
  color: #8b95b5;
  font-size: 12.5px;
  line-height: 1.55;
}
.kx-section + .kx-section {
  margin-top: 25px;
}
.kx-step {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  margin-bottom: 12px;
}
.kx-step > span {
  display: grid;
  width: 25px;
  height: 25px;
  flex: 0 0 25px;
  place-items: center;
  border-radius: 7px;
  background: rgba(99, 102, 241, 0.18);
  color: #a5b4fc;
  font-size: 12px;
  font-weight: 800;
}
.kx-step h3,
.kx-output h3 {
  font-size: 14px;
}
.kx-plugin-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.kx-plugin {
  padding: 13px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.025);
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.kx-plugin:hover {
  border-color: rgba(129, 140, 248, 0.6);
}
.kx-plugin--active {
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
  box-shadow: inset 0 0 0 1px rgba(99, 102, 241, 0.16);
}
.kx-plugin__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--vp-c-text-1);
  font-size: 13px;
}
.kx-switch {
  min-width: 35px;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.12);
  color: #8b95b5;
  font-size: 9px;
  font-weight: 800;
  text-align: center;
}
.kx-plugin--active .kx-switch {
  background: #6366f1;
  color: white;
}
.kx-plugin__description,
.kx-plugin__effect {
  display: block;
  margin-top: 7px;
  color: var(--vp-c-text-2);
  font-size: 11.5px;
  line-height: 1.45;
}
.kx-plugin__effect {
  color: var(--vp-c-text-1);
}
.kx-plugin__effect > span {
  color: #818cf8;
  font-weight: 700;
}
.kx-actions {
  justify-content: flex-end;
}
.kx-app-stage {
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 12px;
  background: #0a0f1e;
}
.kx-app-chrome {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 12px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
  color: #64748b;
  font-size: 10px;
}
.kx-app-chrome span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #334155;
}
.kx-app-chrome strong {
  margin-left: 5px;
  font-weight: 600;
}
.kx-app-canvas {
  position: relative;
  min-height: 360px;
  padding: 20px;
  background:
    radial-gradient(circle at 30% 15%, rgba(99, 102, 241, 0.09), transparent 35%),
    #0d1324;
}
.kx-page-copy {
  display: grid;
  width: 45%;
  gap: 10px;
  opacity: 0.45;
}
.kx-page-copy span {
  height: 9px;
  border-radius: 4px;
  background: #25304a;
}
.kx-page-copy span:nth-child(2) {
  width: 80%;
}
.kx-page-copy span:nth-child(3) {
  width: 60%;
}
.kx-toast-region {
  position: absolute;
  top: 16px;
  right: 16px;
  display: grid;
  width: min(360px, calc(100% - 32px));
  gap: 9px;
}
.kx-toast {
  --toast-accent: #6366f1;
  position: relative;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 20px;
  gap: 10px;
  padding: 13px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-left: 3px solid var(--toast-accent);
  border-radius: 10px;
  background: rgba(20, 28, 49, 0.97);
  box-shadow: 0 16px 35px rgba(0, 0, 0, 0.28);
}
.kx-toast__icon {
  display: grid;
  width: 27px;
  height: 27px;
  place-items: center;
  border-radius: 8px;
  background: color-mix(in srgb, var(--toast-accent) 18%, transparent);
  color: var(--toast-accent);
  font-weight: 850;
}
.kx-toast__title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  color: #eef2ff;
  font-size: 12.5px;
}
.kx-pin,
.kx-tracked {
  color: #fbbf24;
  font-size: 9.5px;
  font-weight: 750;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
.kx-toast__body p {
  margin: 4px 0 8px;
  color: #aeb8d1;
  font-size: 11.5px;
  line-height: 1.45;
}
.kx-toast__lifetime {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 5px 10px;
  color: #7f8aa8;
  font-size: 9.5px;
}
.kx-tracked {
  color: #34d399;
}
.kx-progress {
  height: 2px;
  margin-top: 7px;
  overflow: hidden;
  border-radius: 2px;
  background: #26314b;
}
.kx-progress span {
  display: block;
  height: 100%;
  background: var(--toast-accent);
  transition: width 250ms ease;
}
.kx-toast__dismiss {
  align-self: start;
  padding: 0;
  border: 0;
  background: transparent;
  color: #7f8aa8;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}
.kx-empty {
  padding: 18px;
  border: 1px dashed #334155;
  border-radius: 10px;
  color: #64748b;
  font-size: 11px;
  text-align: center;
}
.kx-output {
  margin-top: 15px;
  padding: 14px 16px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.025);
}
.kx-modifiers {
  margin-top: 16px;
}
.kx-modifiers__head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 10px;
}
.kx-modifiers h3 {
  font-size: 14px;
}
.kx-modifiers__head p {
  max-width: 330px;
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 10.5px;
  line-height: 1.45;
  text-align: right;
}
.kx-output__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.kx-output__state {
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.1);
  color: #7f8aa8;
  font-size: 9.5px;
  font-weight: 800;
}
.kx-output__state--active {
  background: rgba(52, 211, 153, 0.12);
  color: #34d399;
}
.kx-events {
  margin: 11px 0 0;
  padding: 9px 9px 9px 30px;
  border-radius: 7px;
  background: rgba(3, 7, 18, 0.35);
  color: #86efac;
  font-size: 10.5px;
  line-height: 1.7;
}
.kx-output__empty {
  margin: 10px 0 0;
  font-size: 10.5px;
}
.kx-under-hood {
  margin-top: 12px;
  color: #8b95b5;
  font-size: 11px;
}
.kx-under-hood summary {
  cursor: pointer;
}
.kx-graph {
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.025);
}
.kx-graph__row {
  padding: 2px 0;
  color: #dbe1f4;
  overflow-wrap: anywhere;
}
.kx-graph__dim {
  color: #8b95b5;
}
.kx-graph__plugins {
  color: #34d399;
}

@media (max-width: 600px) {
  .pane-wide {
    padding-inline: 14px;
  }
  .kx-plugin-grid {
    grid-template-columns: 1fr;
  }
  .kx-actions {
    justify-content: flex-start;
  }
  .kx-demo-head,
  .kx-modifiers__head {
    align-items: flex-start;
    flex-direction: column;
  }
  .kx-modifiers__head p {
    text-align: left;
  }
  .kx-app-canvas {
    min-height: 390px;
    padding: 12px;
  }
  .kx-toast-region {
    top: 12px;
    right: 12px;
    width: calc(100% - 24px);
  }
}
</style>

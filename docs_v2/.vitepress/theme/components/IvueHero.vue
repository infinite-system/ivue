<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
// The real engine. Not a mock: this file ships as the library.
import { Reactive } from '../../../../lib/Reactive';

class $Counter {
  get count() {
    return ref(0);
  }
  // Derived value: a plain getter. No computed() for simple math.
  get double() {
    return this.count.value * 2;
  }
  inc() {
    this.count.value++;
  }
  dec() {
    this.count.value--;
  }
  reset() {
    this.count.value = 0;
  }
}
const Counter = Reactive($Counter);

const counter: any = new Counter();
// the state manifest — every Ref the template touches
const { count } = counter;
const lastChange = ref('');
const fired = ref(0);
let stop: (() => void) | undefined;

onMounted(() => {
  stop = watch(
    () => count.value,
    (v: number, o: number) => {
      lastChange.value = `${o} → ${v}`;
      fired.value++;
    },
  );
});

onUnmounted(() => {
  stop?.();
  counter.$stopEffects();
});
</script>

<template>
  <section class="ivh">
    <div class="ivh-bg" aria-hidden="true">
      <div class="blob blob-a" />
      <div class="blob blob-b" />
      <svg class="mark" viewBox="0 0 48 48" fill="none">
        <path
          d="M24 24 C24 15.4, 9.6 15.4, 9.6 24 C9.6 32.6, 24 32.6, 24 24 C24 15.4, 38.4 15.4, 38.4 24 C38.4 32.6, 24 32.6, 24 24"
          stroke="url(#ivh-g)" stroke-width="2.6" stroke-linecap="round" fill="none" />
        <defs>
          <linearGradient id="ivh-g" x1="8" y1="14" x2="40" y2="34" gradientUnits="userSpaceOnUse">
            <stop stop-color="#818CF8" />
            <stop offset="1" stop-color="#34D399" />
          </linearGradient>
        </defs>
      </svg>
    </div>

    <div class="ivh-inner">
      <div class="ivh-copy">
        <h1 class="ivh-title">
          <span class="row">Plain classes.</span>
          <span class="row">Full reactivity.</span>
          <span class="row grad">One kilobyte.</span>
        </h1>
        <p class="ivh-tag">
          Native TypeScript classes become fine-grained Vue 3 state. No proxy
          per instance. No decorators. Nothing paid until first access.
        </p>
        <div class="ivh-actions">
          <a class="btn brand" href="/guide/getting-started">Get Started</a>
          <a class="btn alt" href="/guide/introduction">What is ivue?</a>
        </div>
      </div>

      <div class="ivh-demo" aria-label="Live counter demo">
        <pre class="code" aria-hidden="true"><code><span class="kw">class</span> <span class="cl">$Counter</span> {
  <span class="kw">get</span> <span class="fn">count</span>()  { <span class="kw">return</span> <span class="fn">ref</span>(<span class="nu">0</span>) }
  <span class="kw">get</span> <span class="fn">double</span>() { <span class="kw">return</span> <span class="kw">this</span>.count.value * <span class="nu">2</span> }
  <span class="fn">inc</span>() { <span class="kw">this</span>.count.value++ }
}
<span class="kw">export const</span> <span class="cl">Counter</span> = <span class="fn">Reactive</span>(<span class="cl">$Counter</span>)</code></pre>

        <div class="live">
          <div class="vals">
            <div class="val">
              <div class="k">count</div>
              <div class="n"><span :key="count" class="pop">{{ count }}</span></div>
            </div>
            <div class="val">
              <div class="k">double <span class="dim">(plain getter)</span></div>
              <div class="n"><span :key="counter.double" class="pop">{{ counter.double }}</span></div>
            </div>
          </div>
          <div class="controls">
            <button class="ctl minus" type="button" @click="counter.dec">&minus;1</button>
            <button class="ctl plus" type="button" @click="counter.inc">+1</button>
            <button class="ctl ghost" type="button" @click="counter.reset">Reset</button>
          </div>
          <div class="watchline" aria-live="polite">
            <code>watch</code>
            <span v-if="fired">{{ lastChange }} &middot; fired {{ fired }}&times;</span>
            <span v-else class="dim">waiting for the first change</span>
          </div>
        </div>

        <div class="note">
          Live. This counter is a <code>Reactive()</code> class instance,
          running the same 1&nbsp;kB engine that ships.
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ivh {
  position: relative;
  overflow: hidden;
  padding: 56px 24px 40px;
}
@media (min-width: 960px) {
  .ivh {
    padding: 88px 32px 56px;
  }
}

/* ---- background ---- */
.ivh-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.blob {
  position: absolute;
  border-radius: 999px;
  filter: blur(90px);
}
.blob-a {
  width: 560px;
  height: 560px;
  left: -160px;
  top: -220px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.22), transparent 65%);
}
.blob-b {
  width: 520px;
  height: 520px;
  right: -140px;
  bottom: -260px;
  background: radial-gradient(circle, rgba(52, 211, 153, 0.16), transparent 65%);
}
.mark {
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(880px, 92vw);
  height: auto;
  transform: translate(-50%, -50%);
  opacity: 0.05;
}
.dark .mark {
  opacity: 0.07;
}

/* ---- layout ---- */
.ivh-inner {
  position: relative;
  max-width: 1152px;
  margin: 0 auto;
  display: grid;
  gap: 40px;
  align-items: center;
}
@media (min-width: 960px) {
  .ivh-inner {
    grid-template-columns: 1.05fr 0.95fr;
    gap: 64px;
  }
}

/* ---- copy ---- */
.ivh-title {
  margin: 0;
  font-size: clamp(2.5rem, 6.2vw, 4.1rem);
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1.04;
  border: none;
  padding: 0;
}
.ivh-title .row {
  display: block;
}
.ivh-title .grad {
  background: linear-gradient(105deg, #818cf8 15%, #6366f1 45%, #34d399 95%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.ivh-tag {
  margin: 22px 0 0;
  max-width: 30rem;
  font-size: 1.07rem;
  line-height: 1.65;
  color: var(--vp-c-text-2);
}
.ivh-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 30px;
}
.btn {
  display: inline-flex;
  align-items: center;
  height: 48px;
  padding: 0 24px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.95rem;
  text-decoration: none;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, filter 0.18s ease;
}
.btn.brand {
  color: #fff;
  background: linear-gradient(120deg, #6366f1, #4f46e5);
}
.btn.brand:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
  box-shadow: 0 12px 32px -12px rgba(99, 102, 241, 0.6);
}
.btn.alt {
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}
.btn.alt:hover {
  transform: translateY(-1px);
  border-color: var(--vp-c-brand-1);
}
.btn:active {
  transform: translateY(0) scale(0.98);
}

/* ---- demo card (dark in both themes) ---- */
.ivh-demo {
  position: relative;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: #0d1226;
  box-shadow: 0 30px 90px -30px rgba(99, 102, 241, 0.45);
  overflow: hidden;
}
.code {
  margin: 0;
  padding: 20px 22px 18px;
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  line-height: 1.7;
  color: #aab3cf;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
  overflow-x: auto;
}
.code .kw { color: #c084fc; }
.code .fn { color: #7dd3fc; }
.code .cl { color: #fbbf24; }
.code .nu { color: #f0abfc; }

.live {
  padding: 20px 22px 6px;
}
.vals {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.val .k {
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  color: #8b95b5;
}
.val .k .dim {
  color: #5d6785;
}
.val .n {
  margin-top: 2px;
  font-size: 2.6rem;
  font-weight: 750;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  color: #fff;
}
.val:last-child .n {
  background: linear-gradient(105deg, #818cf8, #34d399);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.pop {
  display: inline-block;
}
.controls {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}
.ctl {
  min-width: 64px;
  height: 44px;
  padding: 0 16px;
  border-radius: 10px;
  font-weight: 650;
  font-size: 0.95rem;
  cursor: pointer;
  transition: transform 0.15s ease, filter 0.15s ease, border-color 0.15s ease;
}
.ctl.plus {
  color: #fff;
  background: linear-gradient(120deg, #6366f1, #4f46e5);
  border: none;
}
.ctl.minus,
.ctl.ghost {
  color: #cbd5f0;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(148, 163, 184, 0.22);
}
.ctl:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}
.ctl.minus:hover,
.ctl.ghost:hover {
  border-color: #818cf8;
}
.ctl:active {
  transform: translateY(0) scale(0.96);
}
.watchline {
  margin-top: 16px;
  padding: 10px 0 14px;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: #9aa5c6;
  display: flex;
  gap: 10px;
  align-items: baseline;
}
.watchline code {
  color: #34d399;
  background: rgba(52, 211, 153, 0.1);
  padding: 1px 6px;
  border-radius: 5px;
  font-size: 11.5px;
}
.watchline .dim {
  color: #5d6785;
}
.note {
  padding: 12px 22px 16px;
  font-size: 0.83rem;
  line-height: 1.5;
  color: #8b95b5;
  background: rgba(255, 255, 255, 0.02);
  border-top: 1px solid rgba(148, 163, 184, 0.14);
}
.note code {
  color: #a5b4fc;
}

/* ---- motion (opt-in only) ---- */
@media (prefers-reduced-motion: no-preference) {
  @keyframes ivh-rise {
    from {
      opacity: 0;
      transform: translateY(18px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @keyframes ivh-grad {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes ivh-pop {
    from { transform: scale(1.18); opacity: 0.4; }
    to { transform: scale(1); opacity: 1; }
  }
  .ivh-title {
    animation: ivh-rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  .ivh-tag {
    animation: ivh-rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.08s both;
  }
  .ivh-actions {
    animation: ivh-rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.16s both;
  }
  .ivh-demo {
    animation: ivh-rise 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
  }
  .ivh-title .grad {
    animation: ivh-rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) both, ivh-grad 9s ease-in-out 1s infinite;
  }
  .pop {
    animation: ivh-pop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
}

/* ---- mobile ---- */
@media (max-width: 959px) {
  .ivh-title {
    font-size: clamp(2.2rem, 9vw, 2.9rem);
  }
  .mark {
    width: 140vw;
  }
}
</style>

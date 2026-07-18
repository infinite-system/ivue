<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { withBase } from 'vitepress';
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
  increment() {
    this.count.value++;
  }
  decrement() {
    this.count.value--;
  }
  reset() {
    this.count.value = 0;
  }
}
const Counter = Reactive($Counter);

const counter: any = new Counter();
// the state destructure — every Ref the template touches
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
          d="M24 24 C 19 17, 10.6 17.6, 10.6 24 C 10.6 30.4, 19 31, 24 24 C 29 17, 37.4 17.6, 37.4 24 C 37.4 30.4, 29 31, 24 24 Z"
          stroke="url(#ivh-g)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none" />
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
        <img
          class="ivh-lockup ivh-lockup--light"
          :src="withBase('/brand-lockup-light.png')"
          alt="ivue — Infinite Vue"
          width="392"
          height="128"
        />
        <img
          class="ivh-lockup ivh-lockup--dark"
          :src="withBase('/brand-lockup-dark.png')"
          alt="ivue — Infinite Vue"
          width="392"
          height="128"
        />
        <h1 class="ivh-title">
          <span class="row">Plain classes.</span>
          <span class="row">Full reactivity.</span>
          <span class="row shine">Infinite scalability.</span>
          <span class="row grad">One kilobyte.</span>
        </h1>
        <p class="ivh-tag">
          Native TypeScript classes become fine-grained Vue 3 state. No proxy
          per instance. No decorators. No component coupling. Nothing paid
          until first access.
        </p>
        <div class="ivh-actions">
          <a class="btn brand" :href="withBase('/guide/getting-started')">Get Started</a>
          <a class="btn alt" :href="withBase('/guide/introduction')">What is ivue?</a>
        </div>
      </div>

      <div class="ivh-demo" aria-label="Live counter demo">
        <pre class="code" aria-hidden="true"><code><span class="kw">class</span> <span class="cl">$Counter</span> {
  <span class="kw">get</span> <span class="fn">count</span>() {
    <span class="kw">return</span> <span class="fn">ref</span>(<span class="nu">0</span>)
  }
  <span class="kw">get</span> <span class="fn">double</span>() {
    <span class="kw">return</span> <span class="kw">this</span>.count.value * <span class="nu">2</span>
  }
  <span class="fn">increment</span>() {
    <span class="kw">this</span>.count.value++
  }
}
<span class="kw">export const</span> <span class="cl">Counter</span> = <span class="fn">Reactive</span>(<span class="cl">$Counter</span>)</code></pre>

        <div class="live">
          <div class="vals">
            <div class="val">
              <div class="k">count</div>
              <div class="n">{{ count }}</div>
            </div>
            <div class="val">
              <div class="k">double <span class="dim">(plain getter)</span></div>
              <div class="n">{{ counter.double }}</div>
            </div>
          </div>
          <div class="controls">
            <button class="ctl minus" type="button" @click="counter.decrement">&minus;1</button>
            <button class="ctl plus" type="button" @click="counter.increment">+1</button>
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
  opacity: 0.16;
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
.ivh-lockup {
  display: none;
  width: min(252px, 58vw);
  height: auto;
  margin: 0 0 18px -6px;
}
:root:not(.dark) .ivh-lockup--light {
  display: block;
}
.dark .ivh-lockup--dark {
  display: block;
}

.ivh-title {
  margin: 0;
  font-size: clamp(1.9rem, 4.3vw, 2.9rem);
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1.08;
  border: none;
  padding: 0;
}
.ivh-title .row {
  display: block;
}
.ivh-title .shine {
  background: linear-gradient(
    110deg,
    #7dd3fc 0%,
    #7dd3fc 38%,
    #6ee7b7 47%,
    #34d399 50%,
    #6ee7b7 53%,
    #7dd3fc 62%,
    #7dd3fc 100%
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: ivh-shine 9s linear infinite;
}
:root:not(.dark) .ivh-title .shine {
  background-image: linear-gradient(
    110deg,
    #0ea5e9 0%,
    #0ea5e9 38%,
    #5bbdf2 47%,
    #a3daf9 50%,
    #5bbdf2 53%,
    #0ea5e9 62%,
    #0ea5e9 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
}
@keyframes ivh-shine {
  /* one 4s sweep, then a 5s rest — the gradient is periodic, so the
     resting frame and the restarting frame are identical */
  0% {
    background-position: 0% 0;
  }
  44.44% {
    background-position: -200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .ivh-title .shine {
    animation: none;
  }
}

.ivh-title .grad {
  width: max-content;
  background: linear-gradient(105deg, #818cf8 4%, #3b82f6 47%, #34d399 100%);
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
  background: linear-gradient(120deg, #3b82f6 10%, #1d4ed8 55%, #1e40af 95%);
}
.btn.brand:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
  box-shadow: 0 12px 32px -12px rgba(59, 130, 246, 0.65);
}
.btn.alt {
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}
.btn.alt:hover {
  transform: translateY(-1px);
  border-color: var(--ivue-link-accent);
}
.btn:active,
.btn.brand:active,
.btn.alt:active {
  /* must out-rank .btn.brand:hover — at lower specificity the hover
     transform wins during the press and the compress never shows */
  transform: translateY(0) scale(0.97);
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
  @keyframes ivh-pop {
    from { transform: scale(1.12); }
    to { transform: scale(1); }
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
  .ivh-title .shine {
  background: linear-gradient(
    110deg,
    #7dd3fc 0%,
    #7dd3fc 38%,
    #6ee7b7 47%,
    #34d399 50%,
    #6ee7b7 53%,
    #7dd3fc 62%,
    #7dd3fc 100%
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: ivh-shine 9s linear infinite;
}
:root:not(.dark) .ivh-title .shine {
  background-image: linear-gradient(
    110deg,
    #0ea5e9 0%,
    #0ea5e9 38%,
    #5bbdf2 47%,
    #a3daf9 50%,
    #5bbdf2 53%,
    #0ea5e9 62%,
    #0ea5e9 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
}
@keyframes ivh-shine {
  /* one 4s sweep, then a 5s rest — the gradient is periodic, so the
     resting frame and the restarting frame are identical */
  0% {
    background-position: 0% 0;
  }
  44.44% {
    background-position: -200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .ivh-title .shine {
    animation: none;
  }
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

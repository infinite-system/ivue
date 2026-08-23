// Disposal through REAL components: ivue model + onUnmounted($stopEffects)
// vs a plain Vue composable torn down by the component's own unmount.
// Full templates, real mount/unmount via createApp/app.unmount() in jsdom.
// The axis that matters is RETENTION: when nothing retains the objects,
// default unmount + GC reclaims everything for both shapes. When something
// does retain them (event bus, devtools, stray closure), Vue's unmount
// cannot release the state the retained object holds — $stopEffects can.
//   node --expose-gc bench/disposal-vs-vue-components.mjs
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.Element = dom.window.Element;
global.SVGElement = dom.window.SVGElement;
global.Node = dom.window.Node;

const { Reactive } = await import('../dist/index.es.js');
const vue = await import('vue');
const { createApp, ref, shallowRef, computed, watch, onUnmounted, version } = vue;

const INSTANCES = 10_000;
const PAYLOAD = 1_000; // floats per instance ≈ 8 KB payload each

if (!global.gc) {
  console.error('run with node --expose-gc');
  process.exit(1);
}

function heapMB() {
  global.gc();
  global.gc();
  return process.memoryUsage().heapUsed / 1024 / 1024;
}
function timedGC() {
  const start = performance.now();
  global.gc();
  global.gc();
  return {
    ms: +(performance.now() - start).toFixed(1),
    mb: process.memoryUsage().heapUsed / 1024 / 1024,
  };
}
function payload() {
  return Array.from({ length: PAYLOAD }, (_, i) => i * 1.1);
}

// shared long-lived store ref both shapes subscribe to
const globalFactor = ref(2);

// ---- ivue shape -------------------------------------------------------
class $Model {
  get list() {
    return shallowRef(payload());
  }
  get selection() {
    return ref(0);
  }
  get total() {
    return computed(() => this.sumList());
  }
  sumList() {
    let sum = 0;
    const list = this.list.value, factor = globalFactor.value;
    for (let i = 0; i < list.length; i++) sum += list[i] * factor;
    return sum;
  }
}
const Model = Reactive($Model);

// ---- components (full templates, compiled by Vue) ----------------------
function ivueChild(retained) {
  return {
    template: '<div>{{ total }}</div>',
    setup() {
      const model = new Model();
      watch(() => model.selection.value, () => model.total.value);
      if (retained) retained.push(model);
      onUnmounted(() => model.$stopEffects());
      const { total } = model;
      return { total };
    },
  };
}

function vueChild(retained) {
  return {
    template: '<div>{{ total }}</div>',
    setup() {
      const list = shallowRef(payload());
      const selection = ref(0);
      const total = computed(() => {
        let sum = 0;
        const items = list.value, factor = globalFactor.value;
        for (let i = 0; i < items.length; i++) sum += items[i] * factor;
        return sum;
      });
      watch(() => selection.value, () => total.value);
      if (retained) retained.push({ list, selection, total });
      return { total };
    },
  };
}

function run(name, makeChild, retain) {
  const base = heapMB();
  const retained = retain ? [] : null;
  const el = document.createElement('div');
  document.body.appendChild(el);

  const app = createApp({
    components: { Child: makeChild(retained) },
    template: `<Child v-for="i in ${INSTANCES}" :key="i" />`,
  });
  app.config.warnHandler = () => {};
  app.mount(el);
  const mounted = heapMB() - base;

  const start = performance.now();
  app.unmount(); // Vue's DEFAULT component teardown for every child
  const unmountMs = +(performance.now() - start).toFixed(1);

  el.remove();
  const unmountGC = timedGC(); // the reclaim pass right after teardown
  const afterUnmount = unmountGC.mb - base; // retained array still holds objects (if retain)
  globalFactor.value = globalFactor.value + 1; // one store write — lazy unlink chance
  const afterStoreTick = heapMB() - base;
  if (retained) retained.length = 0;
  const dropGC = timedGC();
  const afterDrop = dropGC.mb - base;

  console.log(JSON.stringify({
    shape: name,
    retained: retain,
    mountedMB: +mounted.toFixed(1),
    afterUnmountMB: +afterUnmount.toFixed(1),
    afterStoreTickMB: +afterStoreTick.toFixed(1),
    afterDropMB: +afterDrop.toFixed(1),
    unmountMsTotal: unmountMs,
    gcAfterUnmountMs: unmountGC.ms,
    gcAfterDropMs: dropGC.ms,
  }));
}

console.log(`vue ${version} — ${INSTANCES} real components each, ~${((INSTANCES * PAYLOAD * 8) / 1024 / 1024).toFixed(0)} MB payload; heap deltas in MB`);

run('vue composable, default unmount', vueChild, false);
run('ivue + onUnmounted($stopEffects)', ivueChild, false);
run('vue composable, default unmount', vueChild, true);
run('ivue + onUnmounted($stopEffects)', ivueChild, true);

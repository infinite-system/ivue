// Disposal, measured: ivue $stopEffects() vs Vue's own effectScope stop.
// The question: after teardown, how much memory is actually RELEASED —
// especially while the object is still retained (devtools, stray closure,
// event bus)? Vue's scope.stop() ends subscriptions; it cannot release
// state the retained object still holds. ivue's $stopEffects() clears the
// cached cells themselves.
//   node --expose-gc bench/disposal-vs-vue.mjs
import { Reactive } from '../dist/index.es.js';
import { ref, shallowRef, computed, watch, effectScope, version } from 'vue';

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
  startWatchers() {
    this.$watch(
      () => this.selection.value,
      () => this.total.value,
    );
  }
}
const Model = Reactive($Model);

// ---- Vue composable shape (same cells, same subscriptions) ------------
function useModel() {
  const scope = effectScope(true);
  return scope.run(() => {
    const list = shallowRef(payload());
    const selection = ref(0);
    const total = computed(() => {
      let sum = 0;
      const items = list.value, factor = globalFactor.value;
      for (let i = 0; i < items.length; i++) sum += items[i] * factor;
      return sum;
    });
    watch(() => selection.value, () => total.value);
    return { scope, list, selection, total };
  });
}

function writeCost() {
  const start = performance.now();
  for (let i = 0; i < 1_000; i++) globalFactor.value = (i % 7) + 1;
  return +((performance.now() - start) * 1000).toFixed(0); // µs
}

function run(name, create, touch, dispose) {
  const base = heapMB();
  const retained = [];
  for (let i = 0; i < INSTANCES; i++) retained.push(create());
  for (const instance of retained) touch(instance);
  const materialized = heapMB() - base;
  const writesBefore = writeCost();

  const start = performance.now();
  for (const instance of retained) dispose(instance);
  const disposeMs = +(performance.now() - start).toFixed(1);

  const afterDisposeRetained = heapMB() - base; // objects STILL retained
  const writesAfter = writeCost();
  retained.length = 0;
  const afterDrop = heapMB() - base;

  console.log(JSON.stringify({
    shape: name,
    materializedMB: +materialized.toFixed(1),
    disposedButRetainedMB: +afterDisposeRetained.toFixed(1),
    droppedMB: +afterDrop.toFixed(1),
    disposeMsTotal: disposeMs,
    storeWriteUsBefore: writesBefore,
    storeWriteUsAfterDispose: writesAfter,
  }));
}

console.log(`vue ${version} — ${INSTANCES} instances, ~${((INSTANCES * PAYLOAD * 8) / 1024 / 1024).toFixed(0)} MB of payload; heap deltas in MB`);

run(
  'ivue + $stopEffects()',
  () => {
    const model = new Model();
    model.startWatchers();
    return model;
  },
  (model) => { model.total.value; },
  (model) => { model.$stopEffects(); },
);

run(
  'vue composable + scope.stop()',
  () => useModel(),
  (model) => { model.total.value; },
  (model) => { model.scope.stop(); },
);

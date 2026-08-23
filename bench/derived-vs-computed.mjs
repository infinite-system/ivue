// Derived plain getters vs computed(): WARM READ cost, parity shapes.
// REAL ivue classes — genuine ref-getters through Reactive(), the exact
// shapes the standard prescribes. Three shapes per complexity tier, same
// derivation logic:
//   getter   — ivue plain getter (recomputes every read, no cache machinery)
//   computed — ivue computed()-in-getter (cached read path)
//   raw      — composable style: plain refs + computed()
// Two read patterns per tier:
//   clean  — N reads, dependencies never change (computed's best case)
//   churn  — write-then-read cycles (computed's dirty path every time)
//   node bench/derived-vs-computed.mjs
import { Reactive } from '../dist/index.es.js';
import { ref, computed, version } from 'vue';

const CLEAN_READS = 2_000_000;
const CHURN_CYCLES = 200_000;

function median(runs) {
  return runs.sort((a, b) => a - b)[Math.floor(runs.length / 2)];
}
function measure(fn) {
  const runs = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    const start = performance.now();
    fn();
    runs.push(performance.now() - start);
  }
  return median(runs);
}

let sink = 0;
const bigArray = Array.from({ length: 100 }, (_, i) => i + 1);

// ---- trivial: a + b -------------------------------------------------
class $TrivialGetter {
  get a() { return ref(1); }
  get b() { return ref(2); }
  get out() { return this.a.value + this.b.value; }
}
class $TrivialComputed {
  get a() { return ref(1); }
  get b() { return ref(2); }
  get outCell() { return computed(() => this.a.value + this.b.value); }
}

// ---- medium: 5-ref template string ----------------------------------
class $MediumGetter {
  get a() { return ref(1); }
  get b() { return ref(2); }
  get c() { return ref(3); }
  get d() { return ref(4); }
  get e() { return ref(5); }
  get out() {
    return `${this.a.value}-${this.b.value}-${this.c.value}:${this.d.value}/${this.e.value}`;
  }
}
class $MediumComputed {
  get a() { return ref(1); }
  get b() { return ref(2); }
  get c() { return ref(3); }
  get d() { return ref(4); }
  get e() { return ref(5); }
  get outCell() {
    return computed(
      () => `${this.a.value}-${this.b.value}-${this.c.value}:${this.d.value}/${this.e.value}`,
    );
  }
}

// ---- heavy: reduce over 100-element array ref ------------------------
class $HeavyGetter {
  get list() { return ref([...bigArray]); }
  get factor() { return ref(2); }
  get out() {
    return this.list.value.reduce((sum, n) => sum + n * this.factor.value, 0);
  }
}
class $HeavyComputed {
  get list() { return ref([...bigArray]); }
  get factor() { return ref(2); }
  get outCell() {
    return computed(() =>
      this.list.value.reduce((sum, n) => sum + n * this.factor.value, 0),
    );
  }
}

// ---- chained: depth-3 derivation of derivation -----------------------
class $ChainedGetter {
  get base() { return ref(3); }
  get l1() { return this.base.value * 2; }
  get l2() { return this.l1 + 10; }
  get out() { return this.l2 * this.l1; }
}
class $ChainedComputed {
  get base() { return ref(3); }
  get l1() { return computed(() => this.base.value * 2); }
  get l2() { return computed(() => this.l1.value + 10); }
  get outCell() { return computed(() => this.l2.value * this.l1.value); }
}

// ---- raw composable parity shapes ------------------------------------
function rawTrivial() {
  const a = ref(1);
  const out = computed(() => a.value + 2);
  return { out, write: (i) => { a.value = i; } };
}
function rawMedium() {
  const a = ref(1), b = ref(2), c = ref(3), d = ref(4), e = ref(5);
  const out = computed(() => `${a.value}-${b.value}-${c.value}:${d.value}/${e.value}`);
  return { out, write: (i) => { c.value = i; } };
}
function rawHeavy() {
  const list = ref([...bigArray]);
  const factor = ref(2);
  const out = computed(() => list.value.reduce((sum, n) => sum + n * factor.value, 0));
  return { out, write: (i) => { factor.value = (i % 7) + 1; } };
}
function rawChained() {
  const base = ref(3);
  const l1 = computed(() => base.value * 2);
  const l2 = computed(() => l1.value + 10);
  const out = computed(() => l2.value * l1.value);
  return { out, write: (i) => { base.value = i; } };
}

// ---- tiers ------------------------------------------------------------
const tiers = [
  {
    name: 'trivial (a+b)',
    getter: new (Reactive($TrivialGetter))(),
    computed: new (Reactive($TrivialComputed))(),
    raw: rawTrivial(),
    write: (instance, i) => { instance.a.value = i; },
  },
  {
    name: 'medium (5-ref string)',
    getter: new (Reactive($MediumGetter))(),
    computed: new (Reactive($MediumComputed))(),
    raw: rawMedium(),
    write: (instance, i) => { instance.c.value = i; },
  },
  {
    name: 'heavy (reduce 100)',
    getter: new (Reactive($HeavyGetter))(),
    computed: new (Reactive($HeavyComputed))(),
    raw: rawHeavy(),
    write: (instance, i) => { instance.factor.value = (i % 7) + 1; },
  },
  {
    name: 'chained (depth 3)',
    getter: new (Reactive($ChainedGetter))(),
    computed: new (Reactive($ChainedComputed))(),
    raw: rawChained(),
    write: (instance, i) => { instance.base.value = i; },
  },
];

console.log(`vue ${version} — ns/read (clean: ${CLEAN_READS / 1e6}M reads, churn: ${CHURN_CYCLES / 1e3}k write+read cycles)`);
for (const tier of tiers) {
  const { getter, computed: computedInstance, raw, write } = tier;
  const runs = {
    'clean.getter': [CLEAN_READS, () => { for (let i = 0; i < CLEAN_READS; i++) sink += getter.out ? 1 : 0; }],
    'clean.computed': [CLEAN_READS, () => { for (let i = 0; i < CLEAN_READS; i++) sink += computedInstance.outCell.value ? 1 : 0; }],
    'clean.raw': [CLEAN_READS, () => { for (let i = 0; i < CLEAN_READS; i++) sink += raw.out.value ? 1 : 0; }],
    'churn.getter': [CHURN_CYCLES, () => { for (let i = 0; i < CHURN_CYCLES; i++) { write(getter, i); sink += getter.out ? 1 : 0; } }],
    'churn.computed': [CHURN_CYCLES, () => { for (let i = 0; i < CHURN_CYCLES; i++) { write(computedInstance, i); sink += computedInstance.outCell.value ? 1 : 0; } }],
    'churn.raw': [CHURN_CYCLES, () => { for (let i = 0; i < CHURN_CYCLES; i++) { raw.write(i); sink += raw.out.value ? 1 : 0; } }],
  };
  const row = { tier: tier.name };
  for (const [key, [per, fn]] of Object.entries(runs)) row[key] = +((measure(fn) * 1e6) / per).toFixed(1);
  console.log(JSON.stringify(row));
}
void sink;

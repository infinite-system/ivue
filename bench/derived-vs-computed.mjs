// Derived plain getters vs computed(): WARM READ cost, parity shapes.
// Three shapes per complexity tier, same derivation logic:
//   getter   — ivue plain getter (recomputes every read, no cache machinery)
//   computed — ivue computed()-in-getter, thin closure (cached read path)
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

// ---- tiers: build the three parity shapes for each ------------------
const bigArray = Array.from({ length: 100 }, (_, i) => i + 1);

function makeTier(name, deps, derive, write) {
  // ivue plain getter
  class $Getter {}
  for (const [key, value] of Object.entries(deps))
    Object.defineProperty($Getter.prototype, key, {
      get() { return (this[`_${key}`] ??= ref(structuredClone(value))); },
      configurable: true,
    });
  Object.defineProperty($Getter.prototype, 'out', {
    get() { return derive(this); }, configurable: true,
  });

  // ivue computed-in-getter (thin closure)
  class $Computed {}
  for (const [key, value] of Object.entries(deps))
    Object.defineProperty($Computed.prototype, key, {
      get() { return (this[`_${key}`] ??= ref(structuredClone(value))); },
      configurable: true,
    });
  Object.defineProperty($Computed.prototype, 'outCell', {
    get() { return (this._out ??= computed(() => derive(this))); },
    configurable: true,
  });

  // raw composable
  const rawRefs = {};
  for (const [key, value] of Object.entries(deps)) rawRefs[key] = ref(structuredClone(value));
  const rawProxy = new Proxy({}, { get: (_, key) => rawRefs[key] });
  const rawOut = computed(() => derive(rawProxy));

  const G = Reactive($Getter);
  const C = Reactive($Computed);
  const getterInstance = new G();
  const computedInstance = new C();

  return {
    name,
    clean: {
      getter: () => { for (let i = 0; i < CLEAN_READS; i++) sink += getterInstance.out ? 1 : 0; },
      computed: () => { for (let i = 0; i < CLEAN_READS; i++) sink += computedInstance.outCell.value ? 1 : 0; },
      raw: () => { for (let i = 0; i < CLEAN_READS; i++) sink += rawOut.value ? 1 : 0; },
    },
    churn: {
      getter: () => { for (let i = 0; i < CHURN_CYCLES; i++) { write(getterInstance, i); sink += getterInstance.out ? 1 : 0; } },
      computed: () => { for (let i = 0; i < CHURN_CYCLES; i++) { write(computedInstance, i); sink += computedInstance.outCell.value ? 1 : 0; } },
      raw: () => { for (let i = 0; i < CHURN_CYCLES; i++) { write(rawProxy, i); sink += rawOut.value ? 1 : 0; } },
    },
  };
}

const tiers = [
  makeTier('trivial (a+b)',
    { a: 1, b: 2 },
    (s) => s.a.value + s.b.value,
    (s, i) => { s.a.value = i; }),
  makeTier('medium (5-ref string)',
    { a: 1, b: 2, c: 3, d: 4, e: 5 },
    (s) => `${s.a.value}-${s.b.value}-${s.c.value}:${s.d.value}/${s.e.value}`,
    (s, i) => { s.c.value = i; }),
  makeTier('heavy (reduce 100)',
    { list: bigArray, factor: 2 },
    (s) => s.list.value.reduce((sum, n) => sum + n * s.factor.value, 0),
    (s, i) => { s.factor.value = (i % 7) + 1; }),
];

// chained depth-3: derivation of derivation of derivation
function makeChained() {
  class $G {
    get base() { return (this._b ??= ref(3)); }
    get l1() { return this.base.value * 2; }
    get l2() { return this.l1 + 10; }
    get out() { return this.l2 * this.l1; }
  }
  class $C {
    get base() { return (this._b ??= ref(3)); }
    get l1() { return (this._1 ??= computed(() => this.base.value * 2)); }
    get l2() { return (this._2 ??= computed(() => this.l1.value + 10)); }
    get outCell() { return (this._3 ??= computed(() => this.l2.value * this.l1.value)); }
  }
  const base = ref(3);
  const r1 = computed(() => base.value * 2);
  const r2 = computed(() => r1.value + 10);
  const rOut = computed(() => r2.value * r1.value);
  const g = new (Reactive($G))();
  const c = new (Reactive($C))();
  return {
    name: 'chained (depth 3)',
    clean: {
      getter: () => { for (let i = 0; i < CLEAN_READS; i++) sink += g.out; },
      computed: () => { for (let i = 0; i < CLEAN_READS; i++) sink += c.outCell.value; },
      raw: () => { for (let i = 0; i < CLEAN_READS; i++) sink += rOut.value; },
    },
    churn: {
      getter: () => { for (let i = 0; i < CHURN_CYCLES; i++) { g.base.value = i; sink += g.out; } },
      computed: () => { for (let i = 0; i < CHURN_CYCLES; i++) { c.base.value = i; sink += c.outCell.value; } },
      raw: () => { for (let i = 0; i < CHURN_CYCLES; i++) { base.value = i; sink += rOut.value; } },
    },
  };
}
tiers.push(makeChained());

console.log(`vue ${version} — ns/read (clean: ${CLEAN_READS / 1e6}M reads, churn: ${CHURN_CYCLES / 1e3}k write+read cycles)`);
for (const tier of tiers) {
  const row = { tier: tier.name };
  for (const pattern of ['clean', 'churn']) {
    const per = pattern === 'clean' ? CLEAN_READS : CHURN_CYCLES;
    for (const shape of ['getter', 'computed', 'raw']) {
      const ms = measure(tier[pattern][shape]);
      row[`${pattern}.${shape}`] = +((ms * 1e6) / per).toFixed(1);
    }
  }
  console.log(JSON.stringify(row));
}
void sink;

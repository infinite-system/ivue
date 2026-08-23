// Reads-per-write RATIO sweep: where does computed() pay for itself?
// Same real-ivue parity shapes as derived-vs-computed.mjs. For each
// tier × ratio R: cycles of (1 write + R reads); report ns/read.
//   node bench/derived-vs-computed-ratio.mjs
import { Reactive } from '../dist/index.es.js';
import { ref, computed, version } from 'vue';

const TOTAL_READS = 2_000_000;
const RATIOS = [1, 2, 5, 10, 50, 100];

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

function rawShape(build) {
  return build();
}

const tiers = [
  {
    name: 'trivial',
    getter: new (Reactive($TrivialGetter))(),
    ivueComputed: new (Reactive($TrivialComputed))(),
    raw: rawShape(() => {
      const a = ref(1), b = ref(2);
      return { out: computed(() => a.value + b.value), write: (i) => { a.value = i; } };
    }),
    write: (instance, i) => { instance.a.value = i; },
  },
  {
    name: 'medium',
    getter: new (Reactive($MediumGetter))(),
    ivueComputed: new (Reactive($MediumComputed))(),
    raw: rawShape(() => {
      const a = ref(1), b = ref(2), c = ref(3), d = ref(4), e = ref(5);
      return {
        out: computed(() => `${a.value}-${b.value}-${c.value}:${d.value}/${e.value}`),
        write: (i) => { c.value = i; },
      };
    }),
    write: (instance, i) => { instance.c.value = i; },
  },
  {
    name: 'heavy',
    getter: new (Reactive($HeavyGetter))(),
    ivueComputed: new (Reactive($HeavyComputed))(),
    raw: rawShape(() => {
      const list = ref([...bigArray]), factor = ref(2);
      return {
        out: computed(() => list.value.reduce((sum, n) => sum + n * factor.value, 0)),
        write: (i) => { factor.value = (i % 7) + 1; },
      };
    }),
    write: (instance, i) => { instance.factor.value = (i % 7) + 1; },
  },
  {
    name: 'chained',
    getter: new (Reactive($ChainedGetter))(),
    ivueComputed: new (Reactive($ChainedComputed))(),
    raw: rawShape(() => {
      const base = ref(3);
      const l1 = computed(() => base.value * 2);
      const l2 = computed(() => l1.value + 10);
      return { out: computed(() => l2.value * l1.value), write: (i) => { base.value = i; } };
    }),
    write: (instance, i) => { instance.base.value = i; },
  },
];

console.log(`vue ${version} — ratio sweep, ns/read (cycles of 1 write + R reads, ~${TOTAL_READS / 1e6}M reads total)`);
for (const tier of tiers) {
  const { getter, ivueComputed, raw, write } = tier;
  for (const R of RATIOS) {
    const cycles = Math.round(TOTAL_READS / R);
    const shapes = {
      getter: () => {
        for (let c = 0; c < cycles; c++) {
          write(getter, c);
          for (let r = 0; r < R; r++) sink += getter.out ? 1 : 0;
        }
      },
      ivueComputed: () => {
        for (let c = 0; c < cycles; c++) {
          write(ivueComputed, c);
          for (let r = 0; r < R; r++) sink += ivueComputed.outCell.value ? 1 : 0;
        }
      },
      rawComputed: () => {
        for (let c = 0; c < cycles; c++) {
          raw.write(c);
          for (let r = 0; r < R; r++) sink += raw.out.value ? 1 : 0;
        }
      },
    };
    const row = { tier: tier.name, readsPerWrite: R };
    for (const [key, fn] of Object.entries(shapes))
      row[key] = +((measure(fn) * 1e6) / (cycles * R)).toFixed(1);
    console.log(JSON.stringify(row));
  }
}
void sink;

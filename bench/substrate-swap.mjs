// The substrate bench behind the "Faster underneath" post: ivue
// creation + tracked reads on whatever `vue` currently resolves to.
// Run it twice to compare engines (npm install vue@X --no-save
// between runs):
//   node bench/substrate-swap.mjs
import { Reactive } from '../dist/index.es.js';
import { ref, watchEffect, version } from 'vue';

class $Point {
  get x() { return ref(1); }
  get y() { return ref(2); }
  get sum() { return this.x.value + this.y.value; }
  bump() { this.x.value++; }
}
const Point = Reactive($Point);

// warmup
for (let i = 0; i < 50_000; i++) new Point().sum;

// creation: 100k instances
let start = performance.now();
const points = new Array(100_000);
for (let i = 0; i < 100_000; i++) points[i] = new Point();
const create = performance.now() - start;

// first-touch + derived read across all
start = performance.now();
let total = 0;
for (const p of points) total += p.sum;
const firstRead = performance.now() - start;

// hot derived reads (leaf-tracked getter), 2M
const p = new Point();
p.sum;
start = performance.now();
for (let i = 0; i < 2_000_000; i++) total += p.sum;
const hotRead = performance.now() - start;

// effect propagation: 100k writes through a watchEffect
let observed = 0;
const stop = watchEffect(() => { observed = p.sum; });
start = performance.now();
for (let i = 0; i < 100_000; i++) p.bump();
const writes = performance.now() - start;
stop();

console.log(JSON.stringify({
  vue: version,
  create100k_ms: +create.toFixed(1),
  firstRead100k_ms: +firstRead.toFixed(1),
  hotRead2M_ms: +hotRead.toFixed(1),
  writes100k_ms: +writes.toFixed(1),
  sink: total + observed,
}));

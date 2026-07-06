// Isolated comparison: Angular Signals vs ivue vs a plain POJO floor.
// Same cell shape on every arm: one raw value, four derived values chained
// off it, one of them memoized. Instances are constructed and NEVER read —
// this measures per-instance allocation cost, not read/recompute cost.
//
// Run with: node --expose-gc bench.mjs   (npm run bench)

import { signal, computed } from '@angular/core';
import { ref, computed as vueComputed } from 'vue';
import { Reactive } from '../../dist/index.es.js';

const N = 100_000;

// --- Arm A: Angular Signals, idiomatic usage (fields, per the Angular docs) ---
class AngularCell {
  raw = signal('');
  value = computed(() => this.raw() + '!');
  display = computed(() => this.value().toUpperCase());
  isEmpty = computed(() => this.raw().length === 0);
  cssClass = computed(() => (this.isEmpty() ? 'empty' : 'filled'));
}

// --- Arm B: ivue — one computed() for the hot value, rest are plain getters ---
class $IvueCell {
  get raw() {
    return ref('');
  }
  get value() {
    return vueComputed(() => this.raw.value + '!');
  }
  get display() {
    return this.value.value.toUpperCase();
  }
  get isEmpty() {
    return this.raw.value.length === 0;
  }
  get cssClass() {
    return this.isEmpty ? 'empty' : 'filled';
  }
}
const IvueCell = Reactive($IvueCell);

// --- Arm C: plain POJO, fields actually assigned (the honest floor) ---
class PlainCell {
  raw = '';
  value = '';
  display = '';
  isEmpty = true;
  cssClass = 'empty';
}

function bench(label, Ctor) {
  const arr = new Array(N);
  if (global.gc) global.gc();
  const before = process.memoryUsage().heapUsed;
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < N; i++) arr[i] = new Ctor();
  const t1 = process.hrtime.bigint();
  if (global.gc) global.gc();
  const after = process.memoryUsage().heapUsed;
  const ms = Number(t1 - t0) / 1e6;
  const bytesPerCell = (after - before) / N;
  console.log(
    label.padEnd(34),
    'create:',
    ms.toFixed(1).padStart(7),
    'ms  ',
    'heap:',
    ((after - before) / 1e6).toFixed(2).padStart(8),
    'MB  ',
    'bytes/cell:',
    bytesPerCell.toFixed(1).padStart(8),
  );
  return arr.length; // keep alive so GC can't collect before measurement
}

if (!global.gc) {
  console.error('Run with --expose-gc for accurate numbers (npm run bench).');
  process.exit(1);
}

console.log(`N = ${N.toLocaleString()} cells, node ${process.version}\n`);

bench('Angular signals (4 eager computed)', AngularCell);
bench('ivue class (1 computed, never read)', IvueCell);
bench('Plain POJO (fields assigned)', PlainCell);

console.log('\n--- second pass (warm, JIT-settled) ---');
bench('Angular signals (4 eager computed)', AngularCell);
bench('ivue class (1 computed, never read)', IvueCell);
bench('Plain POJO (fields assigned)', PlainCell);

// Isolated comparison: Angular Signals vs ivue vs a plain POJO floor.
// Same cell shape on every arm: one raw value, four derived values chained
// off it, one of them memoized. Instances are constructed and NEVER read —
// this measures per-instance allocation cost, not read/recompute cost.
//
// Run with: node --expose-gc bench.mjs   (npm run bench)

import { signal, computed } from '@angular/core';
import { ref, computed as vueComputed } from 'vue';
import { makeAutoObservable } from 'mobx';
import { SvelteCell } from './svelte-cell.compiled.mjs';
import { Reactive } from '../../dist/index.es.js';

const N = 100_000;

// --- Arm E: MobX, idiomatic usage — makeAutoObservable(this) in the
// constructor, the API MobX's own docs recommend by default. It introspects
// the instance at construction time to classify every member (observable /
// computed / action), which is exactly the per-instance "scan and build"
// cost a prototype-transform engine (ivue) never pays — ivue transforms the
// PROTOTYPE once; MobX instruments each INSTANCE, every time.
class MobxCell {
  raw = '';
  constructor() {
    makeAutoObservable(this);
  }
  get value() {
    return this.raw + '!';
  }
  get display() {
    return this.value.toUpperCase();
  }
  get isEmpty() {
    return this.raw.length === 0;
  }
  get cssClass() {
    return this.isEmpty ? 'empty' : 'filled';
  }
}

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

// --- Arm D: hand-rolled vanilla — manual dirty-flag memoization, no library.
// The "what would I actually write in bare JS/React" baseline. Getters/setters
// (not fields) hold the logic, so — unlike Angular/MobX's field-declared
// observables — this DOES compose correctly across `extends`/`super`; the
// cost is that every cached slot + dirty flag is a real per-instance field,
// assigned eagerly at construction, and every dependent flag must be
// invalidated BY HAND on every write. Miss one edge and you get a silently
// stale value — the bookkeeping a reactive engine automates away.
class VanillaCell {
  #raw = '';
  #value = '';
  #valueDirty = true;
  #display = '';
  #displayDirty = true;
  #isEmpty = true;
  #isEmptyDirty = true;
  #cssClass = 'empty';
  #cssClassDirty = true;

  get raw() {
    return this.#raw;
  }
  set raw(v) {
    this.#raw = v;
    // manual invalidation: every dependent field, by hand, every write
    this.#valueDirty = true;
    this.#displayDirty = true;
    this.#isEmptyDirty = true;
    this.#cssClassDirty = true;
  }
  get value() {
    if (this.#valueDirty) {
      this.#value = this.#raw + '!';
      this.#valueDirty = false;
    }
    return this.#value;
  }
  get display() {
    if (this.#displayDirty) {
      this.#display = this.value.toUpperCase();
      this.#displayDirty = false;
    }
    return this.#display;
  }
  get isEmpty() {
    if (this.#isEmptyDirty) {
      this.#isEmpty = this.#raw.length === 0;
      this.#isEmptyDirty = false;
    }
    return this.#isEmpty;
  }
  get cssClass() {
    if (this.#cssClassDirty) {
      this.#cssClass = this.isEmpty ? 'empty' : 'filled';
      this.#cssClassDirty = false;
    }
    return this.#cssClass;
  }
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

bench('MobX (makeAutoObservable)', MobxCell);
bench('Angular signals (4 eager computed)', AngularCell);
bench('Svelte 5 runes ($state/$derived)', SvelteCell);
bench('ivue class (1 computed, never read)', IvueCell);
bench('Vanilla (manual dirty-flag, no library)', VanillaCell);
bench('Plain POJO (fields assigned)', PlainCell);

console.log('\n--- second pass (warm, JIT-settled) ---');
bench('MobX (makeAutoObservable)', MobxCell);
bench('Angular signals (4 eager computed)', AngularCell);
bench('Svelte 5 runes ($state/$derived)', SvelteCell);
bench('ivue class (1 computed, never read)', IvueCell);
bench('Vanilla (manual dirty-flag, no library)', VanillaCell);
bench('Plain POJO (fields assigned)', PlainCell);

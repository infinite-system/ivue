import { computed, reactive, ref } from 'vue';
import { Reactive } from '../lib/Reactive';
import { ivue, iref } from '../lib/ivue';

/**
 * Equivalent "Box" models across every engine, so the benchmarks compare the
 * same shape of work (2 reactive values + a derived area + an update method).
 */

// ---- ivue v2 (Reactive): getters return refs, plain instance ----
class $V2 {
  get w() { return ref(1); }
  get h() { return ref(2); }
  get area() { return computed(() => (this as any).w.value * (this as any).h.value); }
  update() { (this as any).w.value++; }
}
export const V2 = Reactive($V2);

// ---- ivue v1 (ivue): iref fields, reactive() proxy ----
export class V1 {
  w = iref(1);
  h = iref(2);
  get area() { return (this as any).w * (this as any).h; }
  update() { (this as any).w++; }
}
export const makeV1 = () => ivue(V1 as any);

// ---- native Vue 3 composable ----
export const useBox = () => {
  const w = ref(1);
  const h = ref(2);
  const area = computed(() => w.value * h.value);
  const update = () => w.value++;
  return { w, h, area, update };
};

// ---- native reactive() of a plain class ----
export class PlainClass {
  w = 1;
  h = 2;
  get area() { return this.w * this.h; }
  update() { this.w++; }
}
export const makeReactive = () => reactive(new PlainClass());

// ---- baseline: plain object, no reactivity ----
export const makePlain = () => new PlainClass();

// ---- deep 4-level hierarchy (for the inheritance benchmark) ----
class D1 {
  get base() { return ref(10); }
  get tag() { return computed(() => `L1:${(this as any).base.value}`); }
}
class D2 extends D1 {
  get tag() { return computed(() => `L2(${(super.tag as any).value})`); }
}
class D3 extends D2 {
  get extra() { return ref(5); }
  get tag() { return computed(() => `L3[${(super.tag as any).value}]`); }
}
class D4 extends D3 {
  get tag() { return computed(() => `L4{${(super.tag as any).value}}`); }
  get sum() { return computed(() => (this as any).base.value + (this as any).extra.value); }
}
export const Deep = Reactive(D4);

import { describe, expect, it } from 'vitest';
import { shallowReactive, shallowReadonly } from 'vue';
import { nestedProps, type NestedPartial } from '../extras';

type Knobs = {
  wheel: { gain: number; follow: number };
  touch: { gain: number; inertia: number; list: number[] };
  label: string;
};

const defaults = (): Knobs => ({
  wheel: { gain: 1, follow: 0.1 },
  touch: { gain: 1.3, inertia: 30, list: [1, 2, 3] },
  label: 'default'
});

describe('nestedProps', () => {
  it('preserves null-prototype defaults, literal __proto__ keys and sparse arrays', () => {
    const sparse = new Array<{ offset: number }>(2);
    sparse[1] = { offset: 2 };
    const bare = Object.assign(Object.create(null), { gain: 1 });
    const literal = { ['__proto__']: { gain: 2 } };
    const sharedDefaults = { scroll: { sparse, bare, literal } };
    const filled = nestedProps({ scroll: {} }, sharedDefaults) as typeof sharedDefaults;

    expect(Object.getPrototypeOf(filled.scroll.bare)).toBeNull();
    expect(filled.scroll.bare).not.toBe(bare);
    expect(Object.getPrototypeOf(filled.scroll.literal)).toBe(Object.prototype);
    expect(Object.hasOwn(filled.scroll.literal, '__proto__')).toBe(true);
    expect(filled.scroll.literal.__proto__).not.toBe(literal.__proto__);
    expect(filled.scroll.sparse.length).toBe(2);
    expect(0 in filled.scroll.sparse).toBe(false);
    filled.scroll.sparse[1].offset = 9;
    expect(sparse[1].offset).toBe(2);
  });

  it('copies missing default objects and arrays independently for each instance', () => {
    const sharedDefaults = { scroll: { touch: { gain: 1, points: [{ offset: 2 }] }, steps: [1, 2] } };
    const first = nestedProps({ scroll: {} }, sharedDefaults) as typeof sharedDefaults;
    const second = nestedProps({ scroll: {} }, sharedDefaults) as typeof sharedDefaults;

    first.scroll.touch.gain = 9;
    first.scroll.touch.points[0].offset = 8;
    first.scroll.steps.push(3);

    expect(second).toEqual({ scroll: { touch: { gain: 1, points: [{ offset: 2 }] }, steps: [1, 2] } });
    expect(sharedDefaults).toEqual(second);
    expect(second.scroll.touch).not.toBe(sharedDefaults.scroll.touch);
    expect(second.scroll.steps).not.toBe(sharedDefaults.scroll.steps);
  });

  it('preserves supplied containers and opaque default values when copying missing branches', () => {
    class Tuning { gain = 9; }
    const tuning = new Tuning();
    const callback = () => 1;
    const suppliedList = [7];
    const supplied = { scroll: { list: suppliedList } };
    const sharedDefaults = { scroll: { list: [1], touch: { tuning, callback, label: null } } };
    const filled = nestedProps(supplied, sharedDefaults) as typeof sharedDefaults;

    expect(filled).toBe(supplied);
    expect(filled.scroll.list).toBe(suppliedList);
    expect(filled.scroll.touch).not.toBe(sharedDefaults.scroll.touch);
    expect(filled.scroll.touch.tuning).toBe(tuning);
    expect(filled.scroll.touch.callback).toBe(callback);
    expect(filled.scroll.touch.label).toBeNull();
  });

  it('fills a partial object from the defaults at every depth, in place, keeping every supplied leaf', () => {
    const supplied: NestedPartial<Knobs> = { wheel: { gain: 2 }, label: 'mine' };
    const props = nestedProps(supplied, defaults());
    expect(props).toBe(supplied);
    expect(props.wheel).toEqual({ gain: 2, follow: 0.1 });
    expect(props.label).toBe('mine');
    // A top-level prop is Vue's to default: never written here.
    expect('touch' in props).toBe(false);
  });

  it('recurses through every plain-object level, filling only what is missing', () => {
    const tree = { a: { b: { c: 9 }, e: 5 } };
    const filled = nestedProps({ tree }, { tree: { a: { b: { c: 1, d: 2 }, e: 3, f: 4 } } });
    expect(filled.tree).toBe(tree);
    expect(filled.tree).toEqual({ a: { b: { c: 9, d: 2 }, e: 5, f: 4 } });
  });

  it('skips a top-level prop that is not a plain object on both sides, and fills a prototype-less default', () => {
    const bareDefault = Object.create(null) as { z: number; y: number };
    bareDefault.z = 1;
    bareDefault.y = 2;
    const props = { list: null as unknown as number[], label: 'mine', bare: { z: 5 }, fn: () => 1 };
    const filled = nestedProps(props, { list: [1, 2], label: 'default', bare: bareDefault, fn: { a: 1 } });
    expect(filled.list).toBeNull();
    expect(filled.label).toBe('mine');
    expect(filled.bare).toEqual({ z: 5, y: 2 });
    expect(typeof filled.fn).toBe('function');
  });

  it('treats a nested undefined as absent and a nested null as a value', () => {
    const props = nestedProps(
      { wheel: { gain: undefined, follow: null } } as unknown as NestedPartial<Knobs>,
      defaults()
    );
    expect(props.wheel.gain).toBe(1);
    expect(props.wheel.follow).toBeNull();
  });

  it('takes arrays, class instances and functions whole, never merged', () => {
    class Tuning {
      gain = 9;
    }
    const tuning = new Tuning();
    const props = nestedProps(
      { touch: { list: [7] }, wheel: tuning } as unknown as NestedPartial<Knobs>,
      defaults()
    );
    expect(props.touch.list).toEqual([7]);
    expect(props.touch.inertia).toBe(30);
    expect(props.wheel).toBe(tuning);
    expect((props.wheel as unknown as Tuning).gain).toBe(9);
    // An object supplied where the default is an array is kept as is.
    const odd = nestedProps({ touch: { list: { 0: 7 } } } as unknown as NestedPartial<Knobs>, defaults());
    expect(odd.touch.list).toEqual({ 0: 7 });
    // A prototype-less object is plain too.
    const bare = Object.create(null) as { gain: number };
    bare.gain = 4;
    const filled = nestedProps({ wheel: bare } as unknown as NestedPartial<Knobs>, defaults());
    expect(filled.wheel).toBe(bare);
    expect(filled.wheel.follow).toBe(0.1);
  });

  it('works through Vue’s shallow props proxy: the nested object is the parent’s and is filled directly', () => {
    const wheel = { gain: 2 };
    const props = shallowReadonly(shallowReactive({ wheel } as NestedPartial<Knobs>));
    const filled = nestedProps(props, defaults());
    expect(filled.wheel.follow).toBe(0.1);
    expect(wheel).toEqual({ gain: 2, follow: 0.1 });
  });

  it('customCloner is the copy policy for default branches: identity shares them, structuredClone copies built-ins', () => {
    const wheelDefault = { gain: 1, follow: 0.1 };
    const first = nestedProps({} as NestedPartial<Knobs>, { wheel: wheelDefault } as Knobs);
    expect(first.wheel).not.toBe(wheelDefault);
    // The caller owns a fresh tree per instance and says so: no copy.
    const owned = { list: [7] };
    const identity = nestedProps({ touch: {} } as NestedPartial<Knobs>, { touch: owned } as unknown as Knobs, (value) => value);
    expect(identity.touch.list).toBe(owned.list);
    // structuredClone gives Date defaults their own copies.
    const stamp = new Date(0);
    const copied = nestedProps({ meta: {} } as { meta: { stamp?: Date } }, { meta: { stamp } }, structuredClone);
    expect(copied.meta.stamp).not.toBe(stamp);
    expect(copied.meta.stamp?.getTime()).toBe(0);
  });
});

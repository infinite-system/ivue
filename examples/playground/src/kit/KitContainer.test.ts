/*
=== GENERATOR ===
Goal: Prove the base every compositor extends dispatches from its entries and nothing else: the first entry whose `takes` holds renders an item, in declaration order; the one entry without `takes` renders what nothing took; a kit of one role needs neither; a kit that can answer neither throws; and `entry()` carries the container's bind unless the entry brings its own.
[A kit declares one level](./kit.invariants.md#a-kit-declares-one-level)
// domain-invariant: $KitContainer — If a list renders an item, then its role is the first entry whose takes holds, else the one entry without takes, and a kit with neither refuses
Impossible if true: a container that dispatches from a table in code, or a kit with two entries without takes answering roleOf

=== GENERATOR-DESCRIBED ===
$KitContainer reads `$dispatch` once per class through Static(): the takers in
declaration order and the fallback. `roleFor` is a loop over the takers and the
fallback — no allocation, no array method — and `roleOf` is `roleFor` on the
instance's own class.
*/
import { describe, expect, it } from 'vitest';
import { Static } from '../Static';
import { Kit } from './Kit';
import { KitContainer } from './KitContainer';
import { Code } from './fixtures/Code';

type Shape = { kind: string };

class $Shapes extends KitContainer.$Class<Record<string, Kit.Entry>, Shape> {
  static override get $kit() {
    return {
      Plain: { view: 'p' },
      Round: { view: 'i', takes: (shape: Shape) => shape.kind === 'round' },
      Sharp: { view: 'b', takes: (shape: Shape) => shape.kind !== 'round' }
    };
  }
}
const Shapes = { $Class: Static($Shapes), Class: Static($Shapes) };

class $Solo extends KitContainer.$Class<Record<string, Kit.Entry>, Shape> {
  static override get $kit() {
    return { Only: { view: 'o' } };
  }
}
class $Mute extends KitContainer.$Class<Record<string, Kit.Entry>, Shape> {
  static override get $kit() {
    return { A: { view: 'a' }, B: { view: 'b' } };
  }
}
class $Fed extends KitContainer.$Class<Record<string, Kit.Entry>, Shape> {
  static override bindEntry() {
    return { fed: true };
  }
  static override get $kit() {
    return {
      Own: this.entry('p', Code, { bind: () => ({ code: 'own' }) }),
      Base: this.entry('q', Code)
    };
  }
}

describe('a compositor dispatches from its entries', () => {
  // domain-invariant: $KitContainer — If a list renders an item, then its role is the first entry whose takes holds, else the one entry without takes, and a kit with neither refuses
  // impossible-if-true: $KitContainer — a container that dispatches from a table in code, or a kit with two entries without takes answering roleOf
  // invariant: A kit declares one level (examples/playground/src/kit/kit.invariants.md)
  it('the first taker wins in declaration order, the entry without takes is the fallback, one role needs neither, none throws', () => {
    const shapes = new Shapes.Class();
    expect(shapes.roleOf({ kind: 'round' })).toBe('Round');
    expect(shapes.roleOf({ kind: 'square' })).toBe('Sharp');
    expect(Shapes.$Class.$dispatch.takers.map(([role]) => role)).toEqual(['Round', 'Sharp']);
    expect(Shapes.$Class.$dispatch.fallback).toBe('Plain');
    const Unmatched = Kit.Class.derive(Shapes, {
      Sharp: { takes: (shape: Shape) => shape.kind === 'sharp' }
    });
    expect(Unmatched.$Class.roleFor({ kind: 'blob' })).toBe('Plain');
    expect(new (Static($Solo))().roleOf({ kind: 'anything' })).toBe('Only');
    expect(() => new (Static($Mute))().roleOf({ kind: 'x' })).toThrow(/no role takes this item/);
  });

  it("entry() carries the container's bind unless the entry brings its own", () => {
    const Class = Static($Fed);
    expect(Class.$kit.Base.bind?.({} as never)).toEqual({ fed: true });
    expect(Class.$kit.Own.bind?.({} as never)).toEqual({ code: 'own' });
  });
});

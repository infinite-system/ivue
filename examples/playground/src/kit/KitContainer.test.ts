/*
=== GENERATOR ===
Goal: Prove the base every compositor extends holds only what every compositor wrote by hand and never differently: the kit read off its own class, one seam over the entry, and for a list the two facts a list owns — which role an item takes and what identifies it — with the defaults a container may leave in place: a kit of one entry role needs no `roleOf`, a kit of several refuses to guess, and a key is the loop's index.
[A kit declares one level](./kit.invariants.md#a-kit-declares-one-level)
// domain-invariant: $KitContainer — If a container leaves roleOf in place, then a kit with one entry role answers it and a kit with several throws; if it leaves keyOf in place, the key is the index; entryOf, viewOf and propsOf read those two and the kit
Impossible if true: a container with several roles rendering an item through a guessed role, or a base kit that is anything but empty

=== GENERATOR-DESCRIBED ===
$KitContainer reads its statics through one `self` typed as the statics every
container has; `$onlyRole` is a `$`-getter, so Static() builds it once per
class and a subclass with its own `$kit` derives its own.
*/
import { describe, expect, it } from 'vitest';
import { Static } from '../Static';
import type { Kit } from './Kit';
import { KitContainer } from './KitContainer';

type Shape = { kind: string };

class $Solo extends KitContainer.$Class<{ Only: Kit.Entry }, Shape> {
  static override get $kit() {
    return {
      Only: {
        view: 'i',
        bind: ({ item }: Kit.Seam<unknown, Shape>) => ({ 'data-kind': item.kind })
      }
    };
  }
}
class $Ordered extends KitContainer.$Class<{ Only: Kit.Entry; order: readonly ['Only'] }, Shape> {
  static override get $kit() {
    return { Only: { view: 'i' }, order: ['Only'] as const };
  }
}
class $Several extends KitContainer.$Class<{ A: Kit.Entry; B: Kit.Entry }, Shape> {
  static override get $kit() {
    return { A: { view: 'a' }, B: { view: 'b' } };
  }
}
class $Bare extends KitContainer.$Class {}

describe('the base of every compositor', () => {
  // domain-invariant: $KitContainer — If a container leaves roleOf in place, then a kit with one entry role answers it and a kit with several throws; if it leaves keyOf in place, the key is the index; entryOf, viewOf and propsOf read those two and the kit
  // impossible-if-true: $KitContainer — a container with several roles rendering an item through a guessed role, or a base kit that is anything but empty
  // invariant: A kit declares one level (examples/playground/src/kit/kit.invariants.md)
  it('a kit of one entry role needs no roleOf, `order` does not count as a role, a kit of several refuses, and the key is the index', () => {
    const Solo = Static($Solo);
    const solo = new Solo();
    const shape: Shape = { kind: 'round' };
    expect(solo.roleOf(shape)).toBe('Only');
    expect(solo.keyOf(shape, 3)).toBe(3);
    expect(solo.keyOf(shape)).toBeUndefined();
    expect(solo.entryOf(shape)).toBe(Solo.$kit.Only);
    expect(solo.viewOf(shape)).toBe('i');
    expect(solo.propsOf(shape, 0)).toEqual({ 'data-kind': 'round' });
    expect(solo.seam('Only', shape, 0)).toEqual({ 'data-kind': 'round' });
    expect(Solo.$onlyRole).toBe('Only');
    expect(Static($Ordered).$onlyRole).toBe('Only');
    const Several = Static($Several);
    expect(Several.$onlyRole).toBeUndefined();
    expect(() => new Several().roleOf(shape)).toThrow(/roleOf\(\) is not defined/);
    // the base declares no roles: a container that forgets its kit composes nothing
    const Bare = Static($Bare);
    expect(Bare.$kit).toEqual({});
    expect(new Bare().kit).toEqual({});
    expect(Bare.$onlyRole).toBeUndefined();
  });
});

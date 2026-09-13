/*
=== GENERATOR ===
Goal: Prove that a chain of layers can be read back from the data `derive` leaves on each namespace — the contacts where two layers replaced one field or moved one role, named in derivation order, and the resolved tree with the layer that set each seam — without any of it living on the render path.
[A second write to one field is reported never merged](./kit.invariants.md#a-second-write-to-one-field-is-reported-never-merged)
// domain-invariant: $KitInspect — If two layers replace one field of one entry or move one role, then the chain names both layers in order — a warning by default, a throw when strict; a bind written twice is composition, not a contact
// domain-invariant: $KitInspect — If a derived namespace is printed, then every seam shows its position, role, view, class, bind and the layer that set each, and a nested kit prints below its role
Impossible if true: two layers replacing one field with no line in the report

=== GENERATOR-DESCRIBED ===
$KitInspect reads `derivedFrom`, `patch` and `layer` and never a kit's
contents beyond its shape; `derive` is silent on purpose, so a contact is
reported when a spec or a panel asks, not on the render path. A nested
namespace derived by `resolve` keys its writes from its own kit; the
root's patches carry the whole path, so the tree is read from the root.
*/
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Static } from '../Static';
import { Kit } from './Kit';
import { KitInspect } from './KitInspect';
import { KitContainer } from './KitContainer';
import { Panel } from './fixtures/Panel';
import { Strip } from './fixtures/Strip';
import StripHeaderView from './fixtures/Strip.Header.vue';
import StripFooterView from './fixtures/Strip.Footer.vue';
import CardHeaderView from './fixtures/Card.Header.vue';
import CardHeaderFancyView from './fixtures/Card.Header.Fancy.vue';
import { ThemedCode } from './fixtures/ThemedCode';

afterEach(() => {
  vi.restoreAllMocks();
});

/** A tree of derived namespaces: an override two levels deep, written once as data. */
const ThemedPanel = Kit.Class.derive(Panel, {
  Card: { subkit: { Header: { view: CardHeaderFancyView }, Code: { namespace: ThemedCode } } }
});

describe('a kit is read as its template', () => {
  // domain-invariant: $KitInspect — If a kit's entries are declared in a sequence other than its order, then report() names the kit with both sequences; a kit declared as it is ordered is silent
  it('misordered() names a kit whose declaration reads in another sequence than its order, and is silent when they agree', () => {
    expect(KitInspect.Class.misordered(Strip)).toEqual([]);
    // a hand-written subclass that declares its sections backwards but keeps the order
    class $Shuffled extends Strip.$Class {
      static override get $kit() {
        const kit = super.$kit;
        const table = kit as unknown as Record<string, unknown>;
        const roles = kit.order.slice().reverse();
        return {
          ...Object.fromEntries(roles.map((role) => [role, table[role]])),
          order: kit.order
        } as unknown as typeof kit;
      }
    }
    const Shuffled = { ...Strip, $Class: $Shuffled, Class: $Shuffled } as unknown as typeof Strip;
    const lines = KitInspect.Class.misordered(Shuffled);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/declared .* — order reads /);
  });
});

describe('what the printer says when a name is missing', () => {
  // domain-invariant: $KitInspect — If a view has no name or a class chain ends in an anonymous class, then the tree prints `component` and `class` rather than nothing
  it('an unnamed view prints as component, a chain of anonymous classes prints as class', () => {
    const anonymousView = { render: () => null } as never;
    const $Nameless = class extends KitContainer.$Class {
      static override get $kit() {
        // a class expression takes its property's name; indexing a literal keeps it nameless
        const nameless = [class {}][0] as never;
        return { Only: { view: anonymousView, namespace: { $Class: nameless, Class: nameless } } };
      }
    };
    const Nameless = { $Class: Static($Nameless), Class: Static($Nameless) };
    const printed = KitInspect.Class.tree(Nameless);
    expect(printed).toContain('- Only: view component · class class · bind no · base');
  });
});

describe('a second write to one field is reported, never merged', () => {
  // domain-invariant: $KitInspect — If two layers replace one field of one entry or move one role, then the chain names both layers in order — a warning by default, a throw when strict; a bind written twice is composition, not a contact
  // impossible-if-true: $KitInspect — two layers replacing one field with no line in the report
  // invariant: A second write to one field is reported never merged (examples/playground/src/kit/kit.invariants.md)
  it('a view written twice warns with both layers in order, throws when strict, and the last write wins', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const One = Kit.Class.derive(Strip, { Header: { view: StripFooterView } }, 'one');
    expect(KitInspect.Class.report(One)).toEqual([]);
    expect(warn).not.toHaveBeenCalled(); // the shipped base is not a layer
    const Two = Kit.Class.derive(One, { Header: { view: StripHeaderView } }, 'two');
    expect(KitInspect.Class.report(Two)).toEqual(['Header.view: written by one, then two']);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('Header.view: written by one, then two');
    expect(Two.$Class.$kit.Header.view).toBe(StripHeaderView); // derive itself stays silent and the last write wins
    const App = Kit.Class.derive(Two, { Header: { view: StripFooterView } }, 'app');
    expect(() => KitInspect.Class.report(App, { strict: true })).toThrow(
      /Header\.view: written by one, then two, then app/
    );
    expect(KitInspect.Class.conflicts(App)).toEqual([
      'Header.view: written by one, then two, then app'
    ]);
  });

  // domain-invariant: $KitInspect — If two layers replace one field of one entry or move one role, then the chain names both layers in order — a warning by default, a throw when strict; a bind written twice is composition, not a contact
  it('a role moved twice is a contact, an insert beside another is not, a bind over a bind is not, and a nested write is keyed by its path', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Moved = Kit.Class.derive(
      Strip,
      { order: { move: { Footer: { before: 'Header' } } } },
      'one'
    );
    const MovedAgain = Kit.Class.derive(
      Moved,
      { order: { move: { Footer: { after: 'Body' } } } },
      'two'
    );
    expect(KitInspect.Class.report(MovedAgain)).toEqual(['#move:Footer: written by one, then two']);
    expect(String(warn.mock.calls[0][0])).toContain('#move:Footer: written by one, then two');
    warn.mockClear();
    const Inserted = Kit.Class.derive(Strip, {
      order: { after: { Header: ['A'] } },
      A: { view: 'i' }
    });
    const InsertedBeside = Kit.Class.derive(Inserted, {
      order: { after: { Header: ['B'] } },
      B: { view: 'b' }
    });
    const Bound = Kit.Class.derive(Strip, { Item: { bind: ({ inherited }) => inherited() } });
    const BoundAgain = Kit.Class.derive(Bound, { Item: { bind: ({ inherited }) => inherited() } });
    expect(KitInspect.Class.report(InsertedBeside)).toEqual([]);
    expect(KitInspect.Class.report(BoundAgain)).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
    const Nested = Kit.Class.derive(
      Panel,
      { Card: { subkit: { Header: { view: CardHeaderFancyView } } } },
      'fancy'
    );
    const Plain = Kit.Class.derive(
      Nested,
      { Card: { subkit: { Header: { view: CardHeaderView } } } },
      'plain'
    );
    expect(KitInspect.Class.conflicts(Plain)).toEqual([
      'Card.Header.view: written by fancy, then plain'
    ]);
  });

  // domain-invariant: $KitInspect — If a derived namespace is printed, then every seam shows its position, role, view, class, bind and the layer that set each, and a nested kit prints below its role
  it('tree() prints every seam with its position, view, class, bind and the layer that set each', () => {
    const One = Kit.Class.derive(
      Strip,
      { order: { after: { Header: ['A'] } }, A: { view: 'i', bind: () => ({ class: 'a' }) } },
      'one'
    );
    const Two = Kit.Class.derive(
      One,
      { order: { move: { Footer: { before: 'Body' } } }, Header: { view: StripFooterView } },
      'two'
    );
    const printed = KitInspect.Class.tree(Two).split('\n');
    expect(printed[0]).toBe('order: Header A Footer Body');
    expect(printed).toContain('0 Header: view Strip.Footer · class - · bind no · view←two');
    expect(printed).toContain(
      '1 A: view <i> · class - · bind yes · view←one, bind←one, position←one'
    );
    expect(printed).toContain('2 Footer: view Strip.Footer · class - · bind no · position←two');
    expect(printed).toContain('3 Body: view Strip.Body · class - · bind no · base');
    expect(printed).toContain('- Item: view Code · class $Code · bind yes · base');
    const nested = KitInspect.Class.tree(ThemedPanel).split('\n');
    expect(nested[0]).toBe('- Card: view Card · class $Card + 1 layer(s) · bind no · base');
    expect(nested).toContain(
      '  - Header: view Card.Header.Fancy · class - · bind no · view←layer 1'
    );
    expect(nested).toContain(
      '  - Code: view Code · class $ThemedCode · bind no · namespace←layer 1'
    );
    expect(KitInspect.Class.tree(Strip).split('\n')[0]).toBe('order: Header Body Footer');
  });
});

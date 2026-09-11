/*
=== GENERATOR ===
Goal: Prove the kit's five claims against a real component tree — a root, a card with three sections and a code leaf, all `<script setup>` SFCs with class contracts: a class reads only its own kit and a subclass never sees its parent's; an override at any depth is new objects and the base tree is untouched; the entry is the one thing a seam passes and the view constructs the class it names; a derived class's widened contract reaches Vue through a rewrapped view; and the entry's props reach only the getters an author opened.
[A class reads only its own kit](./kit.invariants.md#a-class-reads-only-its-own-kit)
[An override never reaches another tree](./kit.invariants.md#an-override-never-reaches-another-tree)
[The entry crosses the seam](./kit.invariants.md#the-entry-crosses-the-seam)
[A derived contract reaches Vue](./kit.invariants.md#a-derived-contract-reaches-vue)
[Kit props reach the getters an author opens](./kit.invariants.md#kit-props-reach-the-getters-an-author-opens)
[Props and emits are fixed per component object](./kit.invariants.md#props-and-emits-are-fixed-per-component-object)
// domain-invariant: $Kit — If a class's `$kit` is read through a subclass, then the subclass gets its own kit object built by its own getter, in any read order
// domain-invariant: $Kit — If an entry carries a subkit, then resolve derives its namespace and rewraps its view, and every untouched entry keeps its identity
// domain-invariant: $Kit — If an entry names a namespace and keeps the base view, then merge rewraps the view over that namespace
// domain-invariant: $Kit — If a view is rewrapped, then it is a fresh object carrying the base view's fields and the class's props and emits
// domain-invariant: $Kit — If a kit is resolved, then its maps and entries are frozen and its namespaces, views and props bags are not
// domain-invariant: $Kit — If a view's compiled props and emits are fixed, then a prop only a derived class declares falls through the base view as an attribute, its default never applies, and emitting its event warns
// domain-invariant: $Kit — If a mounted view object's props are widened in place, then Vue's cached normalized options ignore the change, which is why a rewrap is a fresh object
Impossible if true: a base kit changed by reading an override's kit
Impossible if true: a view constructing anything but its entry's namespace Class
Impossible if true: a kit value reaching a prop no getter opened

=== GENERATOR-DESCRIBED ===
$Kit is three statics — resolve, derive, view — over data a class declares
as `static get $kit()`. The cache is Static()'s own `$` guard, keyed by the
receiver's own property, so no cache lives here. The fixtures are real:
Card.vue, Code.vue, Panel.vue and their sections compile through
@vitejs/plugin-vue and mount with @vue/test-utils under a dev-mode Vue, so
Vue's readonly props proxy and its undeclared-emit warning are the real
ones, not mocks. Vapor is not exercised: the runtime here is Vue 3.5.
*/
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, shallowRef, type Component } from 'vue';
import { Reactive } from '../ivue';
import { Static } from '../Static';
import { Kit } from './Kit';
import { Card } from './fixtures/Card';
import CardView from './fixtures/Card.vue';
import CardHeadView from './fixtures/CardHead.vue';
import CardBodyView from './fixtures/CardBody.vue';
import { Code } from './fixtures/Code';
import CodeView from './fixtures/Code.vue';
import { ThemedCode } from './fixtures/ThemedCode';
import { FancyCard } from './fixtures/FancyCard';
import FancyHeadView from './fixtures/FancyHead.vue';
import { Panel } from './fixtures/Panel';
import PanelView from './fixtures/Panel.vue';

afterEach(() => {
  vi.restoreAllMocks();
});

/** The raw model a view exposed. test-utils' `wrapper.vm` is its own proxy over the component, and a
 *  read through it reaches an ivue accessor with that proxy as `this` — a foreign receiver the engine
 *  cannot resolve to the instance. The exposed object is the instance itself. */
function exposed<T>(wrapper: { vm: { $: { exposed: unknown } } }): T {
  return wrapper.vm.$.exposed as T;
}

/** A tree of derived namespaces: an override two levels deep, written once as data. */
const ThemedPanel = Kit.Class.derive(Panel, {
  Card: { subkit: { Head: { vue: FancyHeadView }, Code: { namespace: ThemedCode } } }
});

/** An override that brings the widened view by hand — the explicit form of the same thing. */
class $ThemedCard extends Card.$Class {
  static override get $kit() {
    return {
      ...super.$kit,
      Code: { namespace: ThemedCode, vue: Kit.Class.view(CodeView, ThemedCode) }
    };
  }
}
const ThemedCard = { $Class: Static($ThemedCard), Class: Reactive(Static($ThemedCard)) };

/** A consumer turning knobs: the Code role's entry carries props. */
class $DenseCard extends Card.$Class {
  static override get $kit() {
    return {
      ...super.$kit,
      Code: { ...super.$kit.Code, props: { cap: 2, code: 'ignored', theme: 'paper' } }
    };
  }
}
const DenseCard = { $Class: Static($DenseCard), Class: Reactive(Static($DenseCard)) };

describe('a class reads only its own kit', () => {
  // domain-invariant: $Kit — If a class's `$kit` is read through a subclass, then the subclass gets its own kit object built by its own getter, in any read order
  // invariant: A class reads only its own kit (examples/playground/src/kit/kit.invariants.md)
  it('a subclass read after its parent gets its own kit, and the parent keeps its own', () => {
    const base = Card.$Class.$kit;
    expect(Card.$Class.$kit).toBe(base); // Static() caches a $-getter once per receiver
    expect(Card.Class.$kit).toBe(base); // Reactive() returns the same class object
    const fancy = FancyCard.$Class.$kit;
    expect(fancy).not.toBe(base);
    expect(fancy.Head.vue).toBe(FancyHeadView);
    expect(base.Head.vue).toBe(CardHeadView);
    // FINDING: `super.$kit` runs the parent's getter body FOR THE CHILD receiver (Static() caches per
    // receiver), so the child's untouched entries are fresh literals equal to the parent's, not the
    // same objects. Identity of untouched entries holds only inside a resolved kit, where `merge`
    // reads the base through the base receiver — see "a subkit two levels deep".
    expect(fancy.Code).toEqual(base.Code);
    expect(fancy.Code).not.toBe(base.Code);
  });

  // domain-invariant: $Kit — If a class's `$kit` is read through a subclass, then the subclass gets its own kit object built by its own getter, in any read order
  it('a subclass read BEFORE its parent still builds its own kit, and the parent then builds its own', () => {
    class $Early extends Card.$Class {
      static override get $kit() {
        return { ...super.$kit, Head: { vue: FancyHeadView } };
      }
    }
    const Early = Static($Early);
    class $Fresh {
      static get $kit() {
        return { Head: { vue: CardHeadView } };
      }
    }
    class $FreshChild extends $Fresh {
      static override get $kit() {
        return { ...super.$kit, Head: { vue: FancyHeadView } };
      }
    }
    const Fresh = Static($Fresh);
    const FreshChild = Static($FreshChild);
    // child first, on a hierarchy nobody has read yet
    expect(FreshChild.$kit.Head.vue).toBe(FancyHeadView);
    expect(Fresh.$kit.Head.vue).toBe(CardHeadView);
    expect(FreshChild.$kit).not.toBe(Fresh.$kit);
    expect(Early.$kit.Head.vue).toBe(FancyHeadView);
    expect(Card.$Class.$kit.Head.vue).toBe(CardHeadView);
  });

  /** A subclass that does not override `$kit` inherits the GETTER, not the object: Static()'s cache
   *  is per receiver, so it builds an equal kit of its own from the same literals. Identity is per
   *  class, all the way down to the entries; equality is what a kit promises. */
  it('a subclass without its own $kit gets an equal kit of its own, built by the inherited getter', () => {
    class $Plain extends Card.$Class {}
    const Plain = Static($Plain);
    expect(Plain.$kit).not.toBe(Card.$Class.$kit);
    expect(Plain.$kit).toEqual(Card.$Class.$kit);
    expect(Plain.$kit.Head).not.toBe(Card.$Class.$kit.Head);
    expect(Plain.$kit.Head.vue).toBe(Card.$Class.$kit.Head.vue); // the leaves are the shared objects
    expect(Plain.$kit.Code.namespace).toBe(Code);
  });
});

describe('an override never reaches another tree', () => {
  // domain-invariant: $Kit — If an entry carries a subkit, then resolve derives its namespace and rewraps its view, and every untouched entry keeps its identity
  // impossible-if-true: $Kit — a base kit changed by reading an override's kit
  // invariant: An override never reaches another tree (examples/playground/src/kit/kit.invariants.md)
  it('a subkit two levels deep derives the path and leaves every base namespace exactly as it was', () => {
    const themedCard = ThemedPanel.$Class.$kit!.Card as Kit.Entry;
    expect(themedCard.namespace).not.toBe(Card);
    expect(themedCard.namespace!.derivedFrom).toBe(Card); // the base, named — class names do not survive minification
    expect(Card.derivedFrom).toBeUndefined();
    expect(themedCard.namespace!.$Class.prototype).toBeInstanceOf(Card.$Class);
    expect(themedCard.vue).not.toBe(CardView); // rewrapped over the derived Card
    const derivedKit = themedCard.namespace!.Class.$kit as Record<string, Kit.Entry>;
    expect(derivedKit.Head.vue).toBe(FancyHeadView);
    expect(derivedKit.Code.namespace).toBe(ThemedCode);
    expect(derivedKit.Code.vue).not.toBe(CodeView); // merge rewrapped the kept view over ThemedCode
    expect(derivedKit.Body).toBe(Card.$Class.$kit.Body); // untouched, shared
    expect(derivedKit.Frame).toBe(Card.$Class.$kit.Frame);
    // the base tree, after all of that
    expect(Panel.$Class.$kit.Card.namespace).toBe(Card);
    expect(Panel.$Class.$kit.Card.vue).toBe(CardView);
    expect(Card.$Class.$kit.Head.vue).toBe(CardHeadView);
    expect(Card.$Class.$kit.Code.namespace).toBe(Code);
    expect(Card.$Class.$kit.Code.vue).toBe(CodeView);
    expect(Code.$Class.propsTypes).not.toHaveProperty('theme');
  });

  // domain-invariant: $Kit — If an entry names a namespace and keeps the base view, then merge rewraps the view over that namespace
  it('a props-only patch derives nothing and rewraps nothing; a namespace-only patch rewraps the kept view', () => {
    const Tuned = Kit.Class.derive(Panel, { Card: { props: { title: 'x' } } });
    const tuned = Tuned.$Class.$kit!.Card as Kit.Entry;
    expect(tuned.namespace).toBe(Card);
    expect(tuned.vue).toBe(CardView);
    expect(tuned.props).toEqual({ title: 'x' });
    const Renamed = Kit.Class.derive(Card, { Code: { namespace: ThemedCode } });
    const renamed = Renamed.$Class.$kit!.Code as Kit.Entry;
    expect(renamed.namespace).toBe(ThemedCode);
    expect(renamed.vue).not.toBe(CodeView);
    expect((renamed.vue as { props: object }).props).toHaveProperty('theme'); // `props` is fused per read, so equality, not identity
    const Brought = Kit.Class.derive(Card, { Code: { namespace: ThemedCode, vue: CardHeadView } });
    expect((Brought.$Class.$kit!.Code as Kit.Entry).vue).toBe(CardHeadView); // a brought view is left alone
  });

  // domain-invariant: $Kit — If a kit is resolved, then its maps and entries are frozen and its namespaces, views and props bags are not
  it('a resolved kit is frozen in shape and open at its leaves, and the Class slot stays writable', () => {
    const kit = ThemedPanel.$Class.$kit!;
    expect(Object.isFrozen(kit)).toBe(true);
    expect(Object.isFrozen(kit.Card)).toBe(true);
    const entry = kit.Card as Kit.Entry;
    expect(Object.isFrozen(entry.namespace)).toBe(false);
    expect(Object.isFrozen(entry.vue)).toBe(false);
    const Tuned = Kit.Class.derive(Panel, { Card: { props: { title: 'x' } } });
    expect(Object.isFrozen((Tuned.$Class.$kit!.Card as Kit.Entry).props)).toBe(false);
    const original = Code.Class;
    Code.Class = ThemedCode.Class as unknown as typeof Code.Class; // the global override, still possible
    expect(Code.Class).toBe(ThemedCode.Class);
    Code.Class = original;
    expect(Kit.Class.resolve({})).toEqual({});
    expect(Object.isFrozen(Kit.Class.resolve({}))).toBe(true);
  });

  /** `derive` extends `$Class` and runs the subclass through Static() and Reactive(); the result must
   *  behave as a hand-written subclass file would: cached cells, bound methods, `self` reading the
   *  derived statics, the engine helpers present, inherited members intact. */
  it('a derived class is a working ivue class: cells cached, methods bound, self reads its own statics', () => {
    const Derived = Kit.Class.derive(Card, { Head: { vue: FancyHeadView } });
    expect(Derived.$Class.$kit).toBe(Derived.$Class.$kit); // cached once per derived class too
    const instance = new (Derived.Class as typeof Card.Class)({
      title: 't',
      items: ['a']
    } as Card.Props);
    expect(instance.copied).toBe(instance.copied);
    expect(instance.kit.Head.vue).toBe(FancyHeadView);
    expect(instance.kit.Body.vue).toBe(CardBodyView);
    const { onCopy } = instance;
    onCopy('x');
    expect(instance.copiedCount).toBe(1);
    expect(instance.reversedItems).toEqual(['a']);
    expect(typeof instance.$watch).toBe('function');
    expect(new Card.Class({ title: 't', items: [] } as Card.Props).kit.Head.vue).toBe(CardHeadView);
  });
});

describe('the entry crosses the seam', () => {
  const items = ['abcdefg', 'hi'];

  // invariant: The entry crosses the seam (examples/playground/src/kit/kit.invariants.md)
  it('a view mounted with no kit constructs its own class, and the base tree renders its sections', () => {
    const wrapper = mount(CardView, { props: { title: 'Base', items } });
    expect(exposed(wrapper)).toBeInstanceOf(Card.Class);
    expect(wrapper.find('.card-head').text()).toBe('Base');
    expect(wrapper.findAll('.code').map((node) => node.text())).toEqual(['abcd', 'hi']); // the body's :cap="4"
    expect(wrapper.find('.frame .slotted').text()).toBe('Base');
    expect(wrapper.find('.fancy-head').exists()).toBe(false);
  });

  // impossible-if-true: $Kit — a view constructing anything but its entry's namespace Class
  it("a view handed an entry constructs that entry's Class, and the swapped sections render with slot and listener intact", async () => {
    const wrapper = mount(CardView, {
      props: { title: 'Fancy', items, kit: { namespace: FancyCard, vue: CardView } }
    });
    expect(exposed(wrapper)).toBeInstanceOf(FancyCard.Class);
    expect(wrapper.find('.fancy-head').text()).toBe('★ Fancy ★');
    expect(wrapper.find('.card-head').exists()).toBe(false);
    expect(wrapper.findAll('.grouped-body .code').map((node) => node.text())).toEqual([
      'hi',
      'abcdefg'
    ]); // rearranged from the model, no cap
    expect(wrapper.find('.fancy-frame .slotted').text()).toBe('Fancy'); // the slot filled at the seam survived the swap
    await wrapper.findAll('.code')[0].trigger('click');
    expect(exposed<Card.Instance>(wrapper).copiedCount).toBe(1); // the listener at the seam survived the swap
  });

  it("swapping the leaf's class through the kit keeps the body's listener at the seam", async () => {
    const wrapper = mount(CardView, {
      props: { title: 'Themed', items, kit: { namespace: ThemedCard, vue: CardView } }
    });
    const code = wrapper.findAll('.code');
    expect(code.map((node) => node.attributes('data-theme'))).toEqual(['mono', 'mono']); // ThemedCode's default
    await code[1].trigger('click');
    expect(exposed<Card.Instance>(wrapper).copied.value).toEqual(['hi']);
  });

  it('two trees on one page keep their own kits', () => {
    const plain = mount(CardView, { props: { title: 'A', items } });
    const fancy = mount(CardView, {
      props: { title: 'B', items, kit: { namespace: FancyCard, vue: CardView } }
    });
    expect(plain.find('.card-head').exists()).toBe(true);
    expect(plain.find('.fancy-head').exists()).toBe(false);
    expect(fancy.find('.fancy-head').exists()).toBe(true);
    expect(fancy.find('.card-head').exists()).toBe(false);
  });

  it('an override two levels deep reaches the leaf through a real mount, and the plain root does not see it', () => {
    const themed = mount(PanelView, {
      props: { titles: ['a', 'b'], kit: { namespace: ThemedPanel, vue: PanelView } }
    });
    expect(themed.findAll('.fancy-head').length).toBe(2);
    expect(themed.findAll('.code').map((node) => node.attributes('data-theme'))).toEqual([
      'mono',
      'mono',
      'mono',
      'mono'
    ]);
    const plain = mount(PanelView, { props: { titles: ['a'] } });
    expect(plain.findAll('.card-head').length).toBe(1);
    expect(plain.find('.code').attributes('data-theme')).toBeUndefined();
  });
});

describe('a derived contract reaches Vue', () => {
  // domain-invariant: $Kit — If a view is rewrapped, then it is a fresh object carrying the base view's fields and the class's props and emits
  // invariant: A derived contract reaches Vue (examples/playground/src/kit/kit.invariants.md)
  it("the rewrapped view is a fresh object with every base field, the class's props and emits, and the scope id", () => {
    const rewrapped = Kit.Class.view(CodeView, ThemedCode) as Record<string, unknown>;
    const base = CodeView as unknown as Record<string, unknown>;
    expect(rewrapped).not.toBe(base);
    for (const key of Object.keys(base)) expect(rewrapped).toHaveProperty(key);
    expect(rewrapped.props).toEqual(ThemedCode.Class.props); // the contract statics fuse a fresh object per read
    expect(Object.keys(rewrapped.emits as object)).toEqual(Object.keys(ThemedCode.Class.emits)); // validators are fresh functions per read
    expect(rewrapped.props).toHaveProperty('theme');
    expect(base.props).not.toHaveProperty('theme'); // untouched
    expect(base.emits).not.toHaveProperty('select');
    expect(base.__scopeId).toBeDefined(); // Code.vue has <style scoped>
    expect(rewrapped.__scopeId).toBe(base.__scopeId);
    expect(rewrapped.setup).toBe(base.setup);
    expect(rewrapped.render).toBe(base.render);
  });

  // domain-invariant: $Kit — If a view's compiled props and emits are fixed, then a prop only a derived class declares falls through the base view as an attribute, its default never applies, and emitting its event warns
  // invariant: Props and emits are fixed per component object (examples/playground/src/kit/kit.invariants.md)
  it('a prop only the derived class declares arrives through the rewrapped view and falls through as an attribute on the base view', () => {
    const entry = { namespace: ThemedCode, vue: Kit.Class.view(CodeView, ThemedCode) };
    const widened = mount(entry.vue, { props: { code: 'abc', theme: 'paper', kit: entry } });
    expect(exposed(widened)).toBeInstanceOf(ThemedCode.Class);
    expect(exposed<ThemedCode.Instance>(widened).theme).toBe('paper');
    expect(widened.find('.code').attributes('theme')).toBeUndefined();
    expect(widened.find('.code').attributes('data-theme')).toBe('paper');
    const narrow = mount(CodeView, {
      props: { code: 'abc', theme: 'paper', kit: { namespace: ThemedCode, vue: CodeView } } as never
    });
    expect(exposed(narrow)).toBeInstanceOf(ThemedCode.Class);
    expect(narrow.find('.code').attributes('theme')).toBe('paper'); // not a prop here: an attribute
    // FINDING: the derived class's DEFAULT for `theme` never applies either — Vue defaults only the
    // props the view declared, and nestedProps never writes a top-level prop. Through the base view
    // a widened contract is invisible on both sides: no value in, no default out.
    expect(exposed<ThemedCode.Instance>(narrow).theme).toBeUndefined();
  });

  // domain-invariant: $Kit — If a view's compiled props and emits are fixed, then a prop only a derived class declares falls through the base view as an attribute, its default never applies, and emitting its event warns
  // invariant: Props and emits are fixed per component object (examples/playground/src/kit/kit.invariants.md)
  it('an event only the derived class declares emits cleanly through the rewrapped view and warns through the base view', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const entry = { namespace: ThemedCode, vue: Kit.Class.view(CodeView, ThemedCode) };
    const widened = mount(entry.vue, { props: { code: 'abc', kit: entry } });
    exposed<ThemedCode.Instance>(widened).select();
    expect(widened.emitted('select')).toEqual([['abc']]);
    expect(warn).not.toHaveBeenCalled();
    const narrow = mount(CodeView, {
      props: { code: 'abc', kit: { namespace: ThemedCode, vue: CodeView } } as never
    });
    exposed<ThemedCode.Instance>(narrow).select();
    expect(narrow.emitted('select')).toEqual([['abc']]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('emitted event "select"');
  });
});

describe('the two reasons a rewrap is a fresh object, tested against Vue itself', () => {
  /** The record's rejected alternative — mutate the shared view in place — must actually fail, or the
   *  copy is superstition. Vue normalizes a component's props once PER APP and caches by the component
   *  object, so the probe has to stay inside one app: test-utils' `mount` creates a fresh app each call,
   *  and across apps a mutation IS honored (the first version of this probe proved exactly that). */
  // domain-invariant: $Kit — If a mounted view object's props are widened in place, then Vue's cached normalized options ignore the change, which is why a rewrap is a fresh object
  // invariant: A derived contract reaches Vue (examples/playground/src/kit/kit.invariants.md)
  it("widening a shared view's props in place after its first mount changes nothing Vue reads, inside one app", async () => {
    const view = CodeView as unknown as { props: Record<string, unknown> };
    const before = view.props;
    const second = shallowRef(false);
    const kit = { namespace: ThemedCode, vue: CodeView };
    const Host = defineComponent({
      setup() {
        return () => [
          h(CodeView as Component, { code: 'warm', class: 'first' }),
          second.value
            ? h(CodeView as Component, { code: 'abc', theme: 'paper', kit, class: 'second' })
            : null
        ];
      }
    });
    const wrapper = mount(Host); // one app: CodeView's options are normalized and cached here
    view.props = ThemedCode.Class.props as Record<string, unknown>; // the mutation the design forbids
    try {
      second.value = true;
      await nextTick();
      expect(wrapper.find('.second').attributes('theme')).toBe('paper'); // still an attribute: the cache won
    } finally {
      view.props = before;
    }
    // across apps the same mutation would have been honored — which is why identity, not the cache, is the load-bearing reason
    const fresh = mount(Kit.Class.view(CodeView, ThemedCode), {
      props: { code: 'abc', theme: 'paper', kit } as never
    });
    expect(fresh.find('.code').attributes('theme')).toBeUndefined();
  });

  /** The other alternative the record rejects — `Object.create(view)` with own props/emits. */
  it('a view made by Object.create over the base does not render at all — Vue reads component options as own keys', () => {
    const created = Object.create(CodeView as object, {
      props: { value: ThemedCode.Class.props, enumerable: true },
      emits: { value: ThemedCode.Class.emits, enumerable: true }
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const wrapper = mount(created, { props: { code: 'abc' } as never });
    expect(wrapper.find('.code').exists()).toBe(false);
    expect(wrapper.html()).not.toContain('abc');
    expect(warn).toHaveBeenCalled();
  });
});

describe('kit props reach the getters an author opens', () => {
  // impossible-if-true: $Kit — a kit value reaching a prop no getter opened
  // invariant: Kit props reach the getters an author opens (examples/playground/src/kit/kit.invariants.md)
  it('a tunable reads the kit first, an extension reads only the kit, a closed prop never reads it', () => {
    const wrapper = mount(CardView, {
      props: {
        title: 'Dense',
        items: ['abcdefg', 'hi'],
        kit: { namespace: DenseCard, vue: CardView }
      }
    });
    const code = wrapper.findAll('.code');
    expect(code.map((node) => node.text())).toEqual(['ab', 'hi']); // kit cap 2 beat the body's :cap="4"
    expect(code.map((node) => node.attributes('data-theme'))).toEqual(['paper', 'paper']); // an extension
    expect(wrapper.text()).not.toContain('ignored'); // `code` is closed to the kit
    const entry = Card.$Class.$kit.Code;
    const plain = new Code.Class(
      { code: 'abcdefg', cap: 4, kit: entry } as Code.Props,
      (() => {}) as Code.Emits
    );
    expect(plain.cap).toBe(4); // an entry without props changes nothing
    expect(plain.theme).toBeUndefined();
  });

  it("a prop the kit does not own stays live to the parent; one the kit owns stays the kit's", async () => {
    const live = mount(CodeView, { props: { code: 'abcdef', cap: 2 } });
    expect(live.find('.code').text()).toBe('ab');
    await live.setProps({ cap: 3 });
    expect(live.find('.code').text()).toBe('abc');
    const owned = mount(CodeView, {
      props: { code: 'abcdef', cap: 2, kit: { namespace: Code, vue: CodeView, props: { cap: 1 } } }
    });
    expect(owned.find('.code').text()).toBe('a');
    await owned.setProps({ cap: 5 });
    expect(owned.find('.code').text()).toBe('a');
    await nextTick();
  });

  /** Why the kit's values travel through getters and not into props: Vue's props are readonly at the
   *  top level in dev. This test pins the fact the design rests on, with the real proxy. */
  it('Vue refuses a top-level write into props, which is why a kit value never lands in props', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const wrapper = mount(CodeView, { props: { code: 'abcdef', cap: 2 } });
    const model = exposed<Code.Instance>(wrapper);
    (model.props as { cap: number | null }).cap = 5;
    expect(model.cap).toBe(2);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('target is readonly');
  });
});

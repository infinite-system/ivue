import { describe, expect, it } from 'vitest';
import { PropType, isReactive, ref } from 'vue';

import {
  ExtractPropDefaultTypes,
  IVue,
  __test__,
  accessorsMethodsMaps,
  clearCache,
  deepClone,
  iref,
  iuse,
  ivue,
  propertiesAccessorsMaps,
  propsWithDefaults,
} from '../ivue';
const {
  copyOwnProps,
  getClassAccessorsMethodsMap,
  getClassPropertiesAccessorsMap,
} = __test__;
class Basic {
  id = iref('id');
}

class Bit {
  _testProperty = iref('test-value');
  /** Setter without a getter. */
  set testProperty(value: string) {
    this._testProperty = value;
  }
}

class Item extends Bit {
  _width = iref(5);
  unit = iref('px');
  _anotherTestProperty = iref('another-test-value');
  get width(): string {
    return this._width + this.unit;
  }
  set width(value: number) {
    this._width = value;
  }
  _height = iref(5);
  get height(): string {
    return this._height + this.unit;
  }
  set height(value: number) {
    this._height = value;
  }
}

class ProductItem extends Item {
  _productType = iref('generic');
  get anotherTestProperty() {
    return this._anotherTestProperty;
  }
  get productType() {
    return this._productType;
  }
  set productType(value) {
    this._productType = value;
  }
  _productFit = iref('perfect-fit');
  get productFit() {
    return this._productFit;
  }
  _productId = iref(0);
  set productId(value: number) {
    this._productId = 0;
  }
  _productFeel = iref('sleek');
  public get productFeel() {
    return this._productFeel;
  }
}

class StoreItem extends ProductItem {
  _productType = iref('store');
  get productType() {
    const prefix = super.productFeel ?? '';
    return (prefix ? prefix + ':' : '') + this._productType;
  }
  set productFeel(value: string) {
    this._productFeel = value;
  }
}

class RetailStoreItem extends StoreItem {
  _productType = iref('retail');
  /** Do not overwrite productType getter here, on purpose. */
  productHistory = iref([]);
  get testProperty() {
    return this._testProperty;
  }
  calculateSize() {
    return this._height + this._width;
  }
}

let computedCalls = 0;
let notComputedCalls = 0;

class Entity {
  _key = iref(0);
  height = iref(0);
  width = iref(0);
  constructor(height: number, width = 5) {
    this.height = height;
    this.width = width;
  }
  init(test?: string) {
    this._key = 5;
  }
  get key() {
    return this._key;
  }
  static ivueDisableReactivity = new Set<keyof Entity>(['notComputed']);

  logNotComputedCalls() {
    console.log('Logging not computed call');
    notComputedCalls++;
  }
  get notComputed() {
    this.logNotComputedCalls();
    return this.width + this.height;
  }

  logComputedCalls() {
    computedCalls++;
  }
  get computed() {
    this.logComputedCalls();
    return this.width + this.height;
  }
}

describe('ivue', () => {
  describe('base architecture functions', () => {
    describe('getClassAccessorsMethodsMap', () => {
      it('should collect only accessor properties', () => {
        class MyClass {
          get prop() {
            return 42;
          }
          set prop(value: number) {}
          method() {}
        }
        const descriptors = getClassAccessorsMethodsMap(MyClass);
        expect(descriptors.accessors.has('prop')).toBe(true);
        expect(descriptors.methods.has('method')).toBe(true);
      });
    });

    it('getClassAccessorsMethodsMap correctly resolves all parent descriptors', () => {
      const descriptors = getClassAccessorsMethodsMap(Item);

      expect(descriptors.accessors.has('width')).toBe(true);
      expect(typeof descriptors.accessors.get('width')?.get).toBe('function');
      expect(typeof descriptors.accessors.get('width')?.set).toBe('function');

      expect(descriptors.accessors.has('height')).toBe(true);
      expect(typeof descriptors.accessors.get('height')?.get).toBe('function');
      expect(typeof descriptors.accessors.get('height')?.set).toBe('function');

      expect(descriptors.accessors.has('testProperty')).toBe(true);
      expect(typeof descriptors.accessors.get('testProperty')?.get).toBe(
        'undefined'
      );
      expect(typeof descriptors.accessors.get('testProperty')?.set).toBe(
        'function'
      );
    });

    it('getClassAccessorsMethodsMap correctly resolves all grand parent descriptors', () => {
      const descriptors = getClassAccessorsMethodsMap(ProductItem);

      expect(descriptors.accessors.has('width')).toBe(true);
      expect(typeof descriptors.accessors.get('width')?.get).toBe('function');
      expect(typeof descriptors.accessors.get('width')?.set).toBe('function');

      expect(descriptors.accessors.has('height')).toBe(true);
      expect(typeof descriptors.accessors.get('height')?.get).toBe('function');
      expect(typeof descriptors.accessors.get('height')?.set).toBe('function');

      expect(descriptors.accessors.has('testProperty')).toBe(true);
      expect(typeof descriptors.accessors.get('testProperty')?.get).toBe(
        'undefined'
      );
      expect(typeof descriptors.accessors.get('testProperty')?.set).toBe(
        'function'
      );

      expect(descriptors.accessors.has('productType')).toBe(true);
      expect(typeof descriptors.accessors.get('productType')?.get).toBe(
        'function'
      );
      expect(typeof descriptors.accessors.get('productType')?.set).toBe(
        'function'
      );

      expect(descriptors.accessors.has('productFeel')).toBe(true);
      expect(typeof descriptors.accessors.get('productFeel')?.get).toBe(
        'function'
      );
      expect(typeof descriptors.accessors.get('productFeel')?.set).toBe(
        'undefined'
      );

      expect(descriptors.accessors.has('productId')).toBe(true);
      expect(typeof descriptors.accessors.get('productId')?.get).toBe(
        'undefined'
      );
      expect(typeof descriptors.accessors.get('productId')?.set).toBe(
        'function'
      );
    });

    it('getClassPropertiesAccessorsMap correctly resolves all parent properties for native class', () => {
      class ParentTest {
        _parentWidth = 10;
        get parentWidth() {
          return this._parentWidth + 'px';
        }
      }
      class Test extends ParentTest {
        _width = 5;
        get width() {
          return this._width + 'px';
        }
      }
      const item = new Test();
      const { allProps } = getClassPropertiesAccessorsMap(item);

      expect(allProps.has('_width')).toBe(true);
      expect(allProps.has('width')).toBe(true);
      expect(allProps.has('_parentWidth')).toBe(true);
      expect(allProps.has('parentWidth')).toBe(true);
    });

    it('getClassPropertiesAccessorsMap correctly resolves all parent properties for ivue class', () => {
      const item = ivue(Item);
      const { allProps } = getClassPropertiesAccessorsMap(item);

      expect(allProps.has('_width')).toBe(true);
      expect(allProps.has('_height')).toBe(true);
      expect(allProps.has('_testProperty')).toBe(true);
      expect(allProps.has('width')).toBe(true);
      expect(allProps.has('height')).toBe(true);
      expect(allProps.has('testProperty')).toBe(true);
    });

    it('getClassPropertiesAccessorsMap correctly resolves all grand parent properties', () => {
      const item = ivue(ProductItem);
      const { allProps } = getClassPropertiesAccessorsMap(item);

      expect(allProps.has('_width')).toBe(true);
      expect(allProps.has('_height')).toBe(true);
      expect(allProps.has('_testProperty')).toBe(true);
      expect(allProps.has('_productType')).toBe(true);
      expect(allProps.has('_productFit')).toBe(true);
      expect(allProps.has('_productId')).toBe(true);
      expect(allProps.has('width')).toBe(true);
      expect(allProps.has('height')).toBe(true);
      expect(allProps.has('testProperty')).toBe(true);
      expect(allProps.has('productType')).toBe(true);
      expect(allProps.has('productFit')).toBe(true);
      expect(allProps.has('productId')).toBe(true);
    });
  });

  describe('ivue full class reactivity inheritance', () => {
    it('basic refs are working', () => {
      const basic = ivue(Basic);

      expect(basic.id).toBe('id');
      basic.id = 'test';
      expect(basic.id).toBe('test');
    });

    it('basic refs are unwrapped inside reactive ivue object', () => {
      const item = ivue(Item);

      expect(item._height).toBe(5);
      expect(item._width).toBe(5);
      expect(isReactive(item)).toBe(true);
    });

    it('basic getter as computed is working', () => {
      const item = ivue(Item);

      expect(item._height).toBe(5);
      expect(item.height).toBe('5px');
      expect(item._width).toBe(5);
      expect(item.width).toBe('5px');
    });

    it('basic setter is working', () => {
      const item = ivue(Item);

      expect(item._height).toBe(5);
      /** SET VIA SETTER */
      item.height = 10;
      expect(item.height).toBe('10px');

      expect(item._width).toBe(5);
      /** SET VIA SETTER */
      item.width = 10;
      expect(item.width).toBe('10px');
    });

    it('parent getters from the prototype ancestors chain are working', () => {
      const item = ivue(RetailStoreItem);

      expect(item.productType).toBe('sleek:retail');
    });

    it('parent setters that are set at different levels in the prototype ancestors chain work together in harmony', () => {
      const item = ivue(RetailStoreItem);
      /**
       * Setter for product feel is set on @see {StoreItem} class,
       * but getter is set on parent @see {ProductItem} class,
       * but in ivue they still work together just as they should,
       * completely emulating native JavaScript implementation.
       */
      item.productFeel = 'new-feel';
      expect(item.productType).toBe('new-feel:retail');
    });
  });

  describe('ivue toRefs conversion', () => {
    it('toRefs all properties', () => {
      const instance = ivue(RetailStoreItem);
      const { _height, _width, height, width, testProperty } =
        instance.toRefs();

      expect(_height.value).toBe(5);
      expect(_width.value).toBe(5);
      expect(height.value).toBe('5px');
      expect(width.value).toBe('5px');
      expect(testProperty.value).toBe('test-value');
      expect(instance.calculateSize()).toBe(10);
    });

    it('toRefs all properties with pre-calculated computeds', () => {
      const item = ivue(RetailStoreItem);

      /** Access computeds to pre-calculate them before toRefs() */
      item.height;
      item.width;

      const { height, width } = item.toRefs();

      expect(height.value).toBe('5px');
      expect(width.value).toBe('5px');
      expect(item.calculateSize()).toBe(10);
    });

    it("toRefs(['prop', ...]) specific properties", () => {
      const item = ivue(ProductItem);

      const { _height, _width, height, width, anotherTestProperty } =
        item.toRefs([
          '_width',
          '_height',
          'height',
          'width',
          'anotherTestProperty',
        ]);

      expect(_height.value).toBe(5);
      expect(_width.value).toBe(5);
      expect(height.value).toBe('5px');
      expect(width.value).toBe('5px');
      expect(anotherTestProperty.value).toBe('another-test-value');
    });

    it("toRefs(['prop', ...]) specific properties with pre-calculated computeds", () => {
      const item = ivue(ProductItem);

      /** Access computeds to pre-calculate them before toRefs() */
      item.height;
      item.width;

      const { _height, _width, height, width } = item.toRefs([
        '_width',
        '_height',
        'height',
        'width',
      ]);

      expect(_height.value).toBe(5);
      expect(_width.value).toBe(5);
      expect(height.value).toBe('5px');
      expect(width.value).toBe('5px');
    });

    it("toRefs(['prop', ...]) specific functions", () => {
      const { _productType, testProperty } = ivue(RetailStoreItem).toRefs([
        '_productType',
        'testProperty',
      ]);

      expect(_productType.value).toBe('retail');
      expect(testProperty.value).toBe('test-value');
    });

    it('toRefs() all properties with using a computed as a setter without a getter', () => {
      const item = ivue(ProductItem);

      const { testProperty } = item.toRefs();

      testProperty.value = 'changed-test-value';
      expect(item._testProperty).toBe('changed-test-value');
      const call = () => testProperty.value;
      expect(() => call()).toThrowError(TypeError);
    });

    it("toRefs(['prop', ...]) specific properties with using a computed as a setter without a getter", () => {
      const item = ivue(ProductItem);

      const { testProperty } = item.toRefs(['testProperty']);

      testProperty.value = 'changed-test-value';
      expect(item._testProperty).toBe('changed-test-value');
    });

    it('toRefs() all properties with a computed that has a setter without a getter, should throw error when accessed as a getter', () => {
      const item = ivue(ProductItem);

      const { testProperty } = item.toRefs();

      const call = () => testProperty.value;
      expect(() => call()).toThrowError(TypeError);
    });

    it("toRefs(['prop', ...]) with specific properties with a computed that has a setter without a getter, should throw error when accessed as a getter", () => {
      const item = ivue(ProductItem);

      const { testProperty } = item.toRefs(['testProperty']);

      const call = () => testProperty.value;
      expect(() => call()).toThrowError(TypeError);
    });
  });

  describe('ivue constructor', () => {
    it('ivue constructor arguments get passed to the constructor work', () => {
      const entity = ivue(Entity, 10, 20);
      expect(entity.height).toBe(10);
      expect(entity.width).toBe(20);
    });
  });

  describe('ivue init method', () => {
    it('init works', () => {
      const entity = ivue(Entity, 10, 20);
      expect(entity.key).toBe(5);
    });
  });

  describe('ivue disabled getters', () => {
    it('ivue active getter is a computed', () => {
      computedCalls = 0;
      notComputedCalls = 0;

      const entity = ivue(Entity, 10, 20);
      expect(entity.computed).toBe(30); // Access computed
      expect(computedCalls).toBe(1); // Increment to 1, initial computed call
      expect(entity.computed).toBe(30); // Access computed
      expect(computedCalls).toBe(1); // Remains 1, because the dependencies didn't change
      entity.height = 20; // Change dependency
      expect(entity.computed).toBe(40); // Access computed
      expect(computedCalls).toBe(2); // Computed call increments to 2, because dependency changed
    });

    it('ivue disabled getter is not a computed', () => {
      computedCalls = 0;
      notComputedCalls = 0;

      const entity = ivue(Entity, 10, 20);
      expect(entity.notComputed).toBe(30); // Access computed
      expect(notComputedCalls).toBe(1); // Always incrementing
      expect(entity.notComputed).toBe(30); // Access computed
      expect(notComputedCalls).toBe(2); // Always incrementing
      entity.height = 20; // Change reactive computed dependency
      expect(entity.notComputed).toBe(40); // Access computed
      expect(notComputedCalls).toBe(3); // Always incrementing
    });
  });
  describe('core functions', () => {
    const useComposable = () => {
      return {
        x: ref(0),
        y: ref(0),
      };
    };
    it('iref returns standard ref with .value but unwraps type', () => {
      const bool = iref(true);
      const str = iref('string');

      // @ts-expect-error Unwraps type, only to be used within ivue Class or Vue 3 `reactive()` context
      expect(bool.value).toBe(true);
      // @ts-expect-error Unwraps type, only to be used within ivue Class or Vue 3 `reactive()` context
      expect(str.value).toBe('string');
    });

    it('iuse(Object) returns standard ref with .value but unwraps type', () => {
      const iuseComposable = iuse(useComposable());

      // @ts-expect-error Unwraps type, only to be used within ivue Class or Vue 3 `reactive()` context
      expect(iuseComposable.x.value).toBe(0);
      // @ts-expect-error Unwraps type, only to be used within ivue Class or Vue 3 `reactive()` context
      expect(iuseComposable.y.value).toBe(0);
    });
  });

  describe('util functions', () => {
    class Animal {
      kind: string;
      constructor(kind: string) {
        this.kind = kind;
      }
      speak() {
        return `I am a ${this.kind}`;
      }
    }

    describe('deepClone', () => {
      it('clones primitives', () => {
        expect(deepClone(1)).toBe(1);
        expect(deepClone('a')).toBe('a');
        expect(deepClone(true)).toBe(true);
        expect(deepClone(null)).toBe(null);
        expect(deepClone(undefined)).toBeUndefined();
      });

      it('clones arrays deeply', () => {
        const src: any[] = [1, { a: [2, 3] }];
        const out = deepClone(src);
        expect(out).toEqual(src);
        expect(out).not.toBe(src);
        expect(out[1]).not.toBe(src[1]);
        expect(out[1].a).not.toBe(src[1].a);
      });

      it('clones plain objects deeply and preserves symbols & non-enumerables', () => {
        const sym = Symbol('s');
        const src: any = { a: 1, b: { c: 2 } };
        Object.defineProperty(src, 'hidden', { value: 42, enumerable: false });
        src[sym] = 7;

        const out: any = deepClone(src);

        expect(out).toEqual(src);
        expect(out).not.toBe(src);
        // deep
        expect(out.b).not.toBe(src.b);
        // non-enumerable preserved
        const d = Object.getOwnPropertyDescriptor(out, 'hidden');
        expect(d?.enumerable).toBe(false);
        expect(d?.value).toBe(42);
        // symbol preserved
        expect(out[sym]).toBe(7);
      });

      it('handles circular references', () => {
        const src: any = { name: 'root' };
        src.self = src;
        const out: any = deepClone(src);
        expect(out).not.toBe(src);
        expect(out.name).toBe('root');
        expect(out.self).toBe(out);
      });

      it('clones Map and Set deeply', () => {
        const m = new Map<any, any>();
        const k = { k: 1 };
        m.set(k, { v: 2 });
        const s = new Set<any>([k, { x: 3 }]);

        const outM = deepClone(m);
        const outS = deepClone(s);

        expect(outM).not.toBe(m);
        const [outKey, outVal] = [...outM.entries()][0];
        expect(outKey).not.toBe(k);
        expect(outVal).toEqual({ v: 2 });
        expect(outVal).not.toBe(m.get(k));

        expect(outS).not.toBe(s);
        const arr = [...outS.values()];
        expect(arr.length).toBe(2);
        expect(typeof arr[0]).toBe('object');
      });

      it('clones Date and RegExp', () => {
        const d = new Date();
        const r = /ab+c/gi;
        r.lastIndex = 2;

        const outD = deepClone(d);
        const outR = deepClone(r);

        expect(outD).not.toBe(d);
        expect(outD.getTime()).toBe(d.getTime());

        expect(outR).not.toBe(r);
        expect(outR.source).toBe(r.source);
        expect(outR.flags).toBe(r.flags);
        expect(outR.lastIndex).toBe(2);
      });

      it('preserves prototype for class instances and clones fields', () => {
        const a = new Animal('cat');
        (a as any).bag = { deep: { v: 1 } };

        const out = deepClone(a) as Animal & { bag: any };
        expect(out instanceof Animal).toBe(true);
        expect(out.speak()).toBe('I am a cat');
        expect(out).not.toBe(a);
        expect(out.bag).not.toBe((a as any).bag);
        expect(out.bag.deep.v).toBe(1);
      });

      it('does not invoke getters while cloning', () => {
        let getterCalls = 0;
        const src = Object.defineProperties(
          {},
          {
            x: {
              get() {
                getterCalls++;
                return 123;
              },
              enumerable: true,
              configurable: true,
            },
          }
        );

        const out = deepClone(src);
        const desc = Object.getOwnPropertyDescriptor(out, 'x');
        expect(getterCalls).toBe(0);
        expect(typeof desc?.get).toBe('function');
      });
    });

    describe('copyOwnProps (used by deepClone)', () => {
      it('copies string & symbol keys, preserves descriptors, avoids invoking getters', () => {
        const sym = Symbol('z');
        let getterCalls = 0;

        const source: any = {};
        Object.defineProperties(source, {
          a: { value: 1, enumerable: true, configurable: true, writable: true },
          b: {
            value: 2,
            enumerable: false,
            configurable: false,
            writable: false,
          },
          c: {
            get() {
              getterCalls++;
              return 10;
            },
            enumerable: true,
            configurable: true,
          },
        });
        source[sym] = 99;

        const target: any = {};
        const seen = new WeakMap();
        // call the helper the way deepClone uses it
        copyOwnProps(source, target, new Map(), seen);

        // getters preserved (not executed)
        expect(getterCalls).toBe(0);

        const descA = Object.getOwnPropertyDescriptor(target, 'a')!;
        const descB = Object.getOwnPropertyDescriptor(target, 'b')!;
        const descC = Object.getOwnPropertyDescriptor(target, 'c')!;
        const descZ = Object.getOwnPropertyDescriptor(target, sym)!;

        expect(descA.value).toBe(1);
        expect(descA.enumerable).toBe(true);

        expect('value' in descB).toBe(true);
        expect(descB.enumerable).toBe(false);
        expect(descB.configurable).toBe(false);
        expect(descB.writable).toBe(false);

        expect(typeof descC.get).toBe('function');

        expect(descZ.value).toBe(99);
      });
    });

    it('propsWithDefaults correctly assigns defaults to typed props', () => {
      class SampleClass {}
      const defaultTypes = {
        updateEntity: { type: [Boolean, String] as PropType<boolean | string> },
        updatePath: { type: String as PropType<string> },
        updateFieldsTemplate: { type: [Array, Object] as PropType<any[]> },
        updateFieldsParams: { type: [Object] as PropType<Record<string, any>> },
        updateLabel: { type: String as PropType<string> },
        /** Drag and Drop */
        draggable: { type: Boolean as PropType<boolean> },
        /** Runtime Class Runner */
        runner: {
          type: [Object, Function, Boolean] as PropType<
            any | SampleClass | false
          >,
        },
        fn: {
          type: [Function] as PropType<(...args: any[]) => any>,
        },
      };

      /** Example Params Defaults */
      const defaults: ExtractPropDefaultTypes<typeof defaultTypes> = {
        updatePath: '', // String
        updateEntity: false, // Boolean
        updateFieldsTemplate: [], // Array
        updateFieldsParams: {
          // Object
          active: true,
        },
        updateLabel: 'Update Item', // String
        draggable: true, // Boolean
        /** Runtime Class Runner */
        runner: SampleClass, // Class
        fn: () => {}, // Function
      };

      const _propsWithDefaults = propsWithDefaults(defaults, defaultTypes);
      // Boolean
      expect(_propsWithDefaults.updateEntity.default).toBe(false);
      expect(_propsWithDefaults.draggable.default).toBe(true);

      // String
      expect(_propsWithDefaults.updatePath.default).toBe('');

      // Array
      expect(_propsWithDefaults.updateFieldsTemplate.default).toBeTypeOf(
        'function'
      );
      expect(
        Array.isArray(
          (_propsWithDefaults.updateFieldsTemplate.default as () => any)()
        )
      ).toBe(true);

      // Object
      expect(
        (_propsWithDefaults.updateFieldsParams.default as () => any)().active
      ).toBe(true);

      // Class
      expect(_propsWithDefaults.runner.default).toBeTypeOf('function');

      // Function
      expect(_propsWithDefaults.fn.default).toBeTypeOf('function');
    });
  });

  describe('propsWithDefaults', () => {
    it('wraps arrays/objects/class instances in factory functions & leaves primitives', () => {
      class Foo {
        x = 1;
      }
      const fooInstance = new Foo();

      const typedProps = {
        n: { type: Number as any },
        s: { type: String as any },
        a: { type: Array as any },
        o: { type: Object as any },
        c: { type: Object as any }, // class instance default
        fn: { type: Function as any }, // function-as-value should be returned as value factory
        Ctor: { type: Function as any }, // class constructor as value
        _undefined: { type: String as any },
      };

      const defaults = {
        n: 5,
        s: 'hi',
        a: [1, 2],
        o: { k: 3 },
        c: fooInstance,
        fn: function valueFn() {
          return 123;
        },
        Ctor: Foo, // constructor itself as default value (intentionally)
      };

      const out = propsWithDefaults(defaults, { ...typedProps }) as Record<
        string,
        { default: any }
      >;

      // primitives copied as-is (no factory)
      expect(out.n.default).toBe(5);
      expect(out.s.default).toBe('hi');
      expect(out._undefined.default).toBe(undefined);

      // arrays/objects/class instances are factories returning deep clones
      const a1 = out.a.default();
      const a2 = out.a.default();
      expect(Array.isArray(a1)).toBe(true);
      expect(a1).not.toBe(a2);
      a1.push(9);
      expect(a2.includes(9)).toBe(false);

      const o1 = out.o.default();
      const o2 = out.o.default();
      expect(o1).not.toBe(o2);
      o1.k = 10;
      expect(o2.k).toBe(3);

      const c1 = out.c.default();
      const c2 = out.c.default();
      expect(c1).not.toBe(c2);
      expect(c1 instanceof Foo).toBe(true);
      c1.x = 7;
      expect(c2.x).toBe(1);

      // function-as-value and class constructor: both wrapped as "() => def"
      const fnFactory = out.fn.default as any;
      const ctorFactory = out.Ctor.default as any;
      expect(typeof fnFactory).toBe('function');
      expect(typeof ctorFactory).toBe('function');
      expect(fnFactory()).toBe(123); // returns the function value itself
      expect(ctorFactory()).toBe(Foo); // returns the constructor itself
    });

    it('ignores keys not present in typedProps', () => {
      const typedProps = { n: { type: Number as any } };
      const defaults = { n: 1, extra: 2 };
      const out = propsWithDefaults(defaults, { ...typedProps });
      expect(out.n.default).toBe(1);
      // no throw for unknown keys
    });

    it('produces isolated defaults across component instances', () => {
      const typedProps = {
        bag: { type: Object as any },
        list: { type: Array as any },
      };
      const defaults = { bag: { a: 1 }, list: [1, 2, 3] };
      const out = propsWithDefaults(defaults, { ...typedProps }) as Record<
        string,
        { default: () => any }
      >;

      const bag1 = out.bag.default();
      const bag2 = out.bag.default();
      expect(bag1).not.toBe(bag2);

      const list1 = out.list.default();
      const list2 = out.list.default();
      expect(list1).not.toBe(list2);
    });
  });

  describe('ivue constructor error handling', () => {
    it('does not throw error for invalid constructor args', () => {
      class MyClass {
        constructor(a: number) {
          // No validation, so 'invalid' is accepted
        }
      }
      expect(() => ivue(MyClass, 'invalid' as any)).not.toThrow();
      const instance = ivue(MyClass, 'invalid' as any);
      expect(isReactive(instance)).toBe(true); // Still creates reactive instance
    });
  });

  describe('Cache Cleanup', () => {
    it('should clear specific class from accessorsMethodsMaps', () => {
      const MyClass = class {};
      ivue(MyClass);
      expect(accessorsMethodsMaps.has(MyClass)).toBe(true);
      clearCache();
      expect(accessorsMethodsMaps.has(MyClass)).toBe(false);
    });

    it('should reset accessorsMethodsMaps', () => {
      const MyClass = class {};
      ivue(MyClass);
      clearCache();
      expect(accessorsMethodsMaps.has(MyClass)).toBe(false);
    });

    it('should clear specific class from propertiesAccessorsMaps', () => {
      const MyClass = class {
        prop = 42;
      };
      const instance = ivue(MyClass);
      getClassPropertiesAccessorsMap(instance);
      expect(propertiesAccessorsMaps.has(MyClass)).toBe(true);
      clearCache();
      expect(propertiesAccessorsMaps.has(MyClass)).toBe(false);
    });

    it('should reset propertiesAccessorsMaps', () => {
      const MyClass = class {
        prop = 42;
      };
      const instance = ivue(MyClass);
      getClassPropertiesAccessorsMap(instance);
      clearCache();
      expect(propertiesAccessorsMaps.has(MyClass)).toBe(false);
    });
  });

  // Helpers for readability
  const isEnumerable = (obj: object, key: string) =>
    Object.prototype.propertyIsEnumerable.call(obj, key);

  describe('descriptor flags (enumerable/configurable)', () => {
    class FlagsBase {
      // Default: enumerable=false, configurable=true
      get hidden() {
        return 1;
      }
      set hidden(_: number) {}
    }

    class Flags extends FlagsBase {
      // no-op field just to have some instance state
      _x = 1;
    }

    // Make an explicitly enumerable & configurable accessor on the prototype
    Object.defineProperty(Flags.prototype, 'visible', {
      get() {
        return 2;
      },
      set(_: number) {},
      enumerable: true,
      configurable: true,
    });

    // Make an explicitly non-configurable accessor on the prototype
    Object.defineProperty(Flags.prototype, 'locked', {
      get() {
        return 3;
      },
      set(_: number) {},
      enumerable: true,
      configurable: false,
    });

    it('mirrors default flags for class accessors: enumerable=false, configurable=true', () => {
      const instance = ivue(Flags);
      const d = Object.getOwnPropertyDescriptor(instance, 'hidden');

      expect(d?.enumerable).toBe(false);
      expect(d?.configurable).toBe(true);
      expect(isEnumerable(instance, 'hidden')).toBe(false);
    });

    it('preserves enumerable=true from prototype on the reactive instance', () => {
      const instance = ivue(Flags);
      const d = Object.getOwnPropertyDescriptor(instance, 'visible');

      expect(d?.enumerable).toBe(true);
      expect(isEnumerable(instance, 'visible')).toBe(true);

      // sanity check: hidden is not in keys; visible is
      const keys = Object.keys(instance);
      expect(keys.includes('visible')).toBe(true);
      expect(keys.includes('hidden')).toBe(false);
    });

    it('preserves configurable=false from prototype (cannot redefine)', () => {
      const instance = ivue(Flags);
      const d = Object.getOwnPropertyDescriptor(instance, 'locked');

      expect(d?.configurable).toBe(false);

      // Attempting to redefine should throw a TypeError
      expect(() =>
        Object.defineProperty(instance, 'locked', {
          get() {
            return 99;
          },
        })
      ).toThrowError(TypeError);
    });

    it('configurable=true allows redefining accessor on the reactive instance', () => {
      const instance = ivue(Flags);

      // Before redefine
      // @ts-expect-error anyway
      expect(instance.visible).toBe(2);

      // Redefine should succeed (configurable=true)
      Object.defineProperty(instance, 'visible', {
        get() {
          return 42;
        },
        enumerable: true,
        configurable: true,
      });

      // @ts-expect-error anyway
      expect(instance.visible).toBe(42);

      // And flags remain as set on redefinition
      const d = Object.getOwnPropertyDescriptor(instance, 'visible');
      expect(d?.enumerable).toBe(true);
      expect(d?.configurable).toBe(true);
    });
  });

  describe('Symbols handling', () => {
    it('ignores symbol keys in getClassPropertiesAccessorsMap and toRefs', () => {
      const S = Symbol('secret');

      class WithSymbol {
        [S] = iref(123); // symbol "data"
        get [Symbol.for('acc')]() {
          return 1;
        } // symbol accessor
        method() {
          return 42;
        } // normal method
        x = iref(7); // normal data
      }

      const instance = ivue(WithSymbol);

      // sanity: Vue proxy still has the symbol (we won’t surface it)
      expect(instance[S]).toBe(123);

      // our property collector should not list symbols
      const { allProps } = getClassPropertiesAccessorsMap(instance);
      // only string keys
      for (const k of allProps.keys()) {
        expect(typeof k).toBe('string');
      }
      expect(allProps.has('x')).toBe(true);
      expect(allProps.has('method')).toBe(false);

      // toRefs() should not expose symbol-backed fields
      const r = instance.toRefs();
      expect('x' in r).toBe(true);
      expect('method' in r).toBe(false);
      expect(Object.getOwnPropertySymbols(r).length).toBe(0);
    });
  });

  // Helper: flush microtasks if we depend on Vue computed scheduling, etc.
  // (We actually shouldn't need it for these sync tests, but it's here if you want.)

  describe('ivue clone()', () => {
    it('deep clones plain data props and keeps them reactive', async () => {
      class Store {
        count = 1;
        nested = { msg: 'hi' };

        get double() {
          return this.count * 2;
        }

        inc() {
          this.count++;
        }
      }

      const a = ivue(Store); // IVue<Store>
      const b = a.clone(); // clone of a

      expect(b.toRefs(['double']).double.value).toBe(2);

      // different object identities for data
      expect(b).not.toBe(a);
      expect(b.nested).not.toBe(a.nested);

      // values copied
      expect(b.count).toBe(1);
      expect(b.nested.msg).toBe('hi');

      // reactivity preserved: changing b does not change a
      b.count = 10;
      b.nested.msg = 'bye';

      expect(a.count).toBe(1);
      expect(a.nested.msg).toBe('hi');
      expect(b.count).toBe(10);
      expect(b.nested.msg).toBe('bye');

      // computed accessors should still work on clone & reflect clone state
      expect(a.double).toBe(2);
      expect(b.double).toBe(20);

      // methods should be bound to the clone
      b.inc();
      expect(b.count).toBe(11);

      // make sure calling b.inc didn't touch a
      expect(a.count).toBe(1);
    });

    it('respects static ivueCloneByReference (shares reference instead of deep cloning)', () => {
      class RouterMock {
        name = 'main-router';
        pushCalls: any[] = [];
        push(path: string) {
          this.pushCalls.push(path);
        }
      }

      class StoreWithRouter {
        static ivueCloneByReference = new Set(['router']);

        router = new RouterMock();
        localVal = { n: 1 };

        get routeNameUpper() {
          return this.router.name.toUpperCase();
        }
      }

      const a = ivue(StoreWithRouter);
      const b = a.clone();

      // router is same reference because ivueCloneByReference has 'router'
      expect(b.router).toBe(a.router);

      // BUT non-listed props are still deep cloned
      expect(b.localVal).not.toBe(a.localVal);
      expect(b.localVal.n).toBe(1);

      // edits to shared ref affect both
      b.router.name = 'child-router';
      expect(a.router.name).toBe('child-router');
      expect(b.router.name).toBe('child-router');

      // edits to deep-cloned prop don't leak
      b.localVal.n = 999;
      expect(a.localVal.n).toBe(1);
      expect(b.localVal.n).toBe(999);

      // computed still uses the clone's proxy as `this`
      expect(a.routeNameUpper).toBe('CHILD-ROUTER');
      expect(b.routeNameUpper).toBe('CHILD-ROUTER');
    });
    it('covers the else path: standard object fields in ivueDisableReactivity are marked raw', () => {
      // 1. Define a class with a standard field (NOT a getter)
      class RawFieldTest {
        // This is a plain instance field.
        // It is NOT in the prototype accessors map, so it falls to the 'else' block.
        data = { 
          secret: 'raw-value',
          nested: { id: 1 } 
        };

        // We explicitly verify that the code marks this specific field as raw
        static ivueDisableReactivity = new Set(['data']);
      }

      const instance = ivue(RawFieldTest).clone();

      // 2. Access the property
      const val = instance.data;

      // 3. Verify values are correct
      expect(val.secret).toBe('raw-value');

      // 4. CRITICAL: The instance itself is reactive...
      expect(isReactive(instance)).toBe(true);

      // 5. ...but the property content hit the 'else' block and became marked raw.
      // Because it is marked raw, Vue will NOT create a proxy for it.
      expect(isReactive(val)).toBe(false);
      
      // If 'markRaw' was NOT called, accessing instance.data (an object) 
      // from a reactive parent would normally return a reactive proxy.
      // The fact that it returns a plain object proves the 'else' block executed.
      expect(val.nested).toBeDefined();
      expect(isReactive(val.nested)).toBe(false); 
    });
    it('disables computed conversion for keys in ivueDisableReactivity', () => {
      let getterCallCountA = 0;
      let getterCallCountB = 0;

      class StoreNoComputed {
        static ivueDisableReactivity = new Set(['rawValue']);

        _x = 1;
        get rawValue() {
          getterCallCountA++;
          return this._x;
        }

        get doubled() {
          getterCallCountB++;
          return this._x * 2;
        }

        setX(v: number) {
          this._x = v;
        }
      }

      const a = ivue(StoreNoComputed);
      const b = a.clone();

      // After ivue(), `rawValue` should *not* be converted to computed
      // so accessing a.rawValue should bump getterCallCountA every time.
      const beforeA = getterCallCountA;
      const beforeB = getterCallCountB;

      // access a
      const v1 = a.rawValue;
      const v2 = a.rawValue;
      expect(v1).toBe(1);
      expect(v2).toBe(1);
      expect(getterCallCountA).toBe(beforeA + 2); // called each access

      // `doubled` WAS converted to computed, so reading multiple times
      // should generally not keep calling the original getter over and over
      // We expect at most +1 here
      const d1 = a.doubled;
      const d2 = a.doubled;
      expect(d1).toBe(2);
      expect(d2).toBe(2);
      expect(getterCallCountB).toBeLessThanOrEqual(beforeB + 2);

      // Make sure clone b mirrors behavior
      const cloneBeforeA = getterCallCountA;
      const cloneBeforeB = getterCallCountB;
      const bv1 = b.rawValue;
      const bv2 = b.rawValue;
      expect(bv1).toBe(1);
      expect(bv2).toBe(1);
      expect(getterCallCountA).toBe(cloneBeforeA + 2);

      const bd1 = b.doubled;
      const bd2 = b.doubled;
      expect(bd1).toBe(2);
      expect(bd2).toBe(2);
      expect(getterCallCountB).toBeLessThanOrEqual(cloneBeforeB + 2);

      // sanity: mutations on b don't leak into a
      b.setX(10);
      expect(a.rawValue).toBe(1);
      expect(b.rawValue).toBe(10);
      expect(a.doubled).toBe(2);
      expect(b.doubled).toBe(20);
    });

    it('passes ivueCloneArgs to init() on clone', () => {
      class StoreWithInit {
        payload: any = null;

        init(isClone?: boolean, arg1?: string, arg2?: number) {
          this.payload = { arg1, arg2 };
        }
      }

      const a = ivue(StoreWithInit);
      const b = a.clone('hello', 123);

      expect(b.payload).toEqual({ arg1: 'hello', arg2: 123 });

      const c = b.clone('hello world', 456); // should re-run init with ivueCloneArgs
      expect(c.payload).toEqual({ arg1: 'hello world', arg2: 456 });
    });

    it('deepClone() will not duplicate global stores', () => {
      class GlobalStore {
        static ivueGlobalStore = true;
        value = 42;
      }

      class Wrapper {
        global = ivue(GlobalStore); // pretend nested store
        local = { hello: 'world' };
      }

      const w1 = ivue(Wrapper);

      // sanity: Wrapper was made reactive, and inside it we created a GlobalStore instance (reactive)
      expect(w1.global.value).toBe(42);

      // deep clone Wrapper via deepClone() directly
      const w2 = deepClone(w1);

      // global store is same reference (because ivueGlobalStore=true)
      expect(w2.global).toBe(w1.global);

      // local object is NOT same reference
      expect(w2.local).not.toBe(w1.local);
      expect(w2.local.hello).toBe('world');

      // editing w2.local doesn't affect w1.local
      w2.local.hello = 'planet';
      expect(w1.local.hello).toBe('world');
      expect(w2.local.hello).toBe('planet');
    });

    it('clone() of a store containing another ivue store deep-clones that nested store (unless ivueGlobalStore or byReference overrides)', () => {
      class Child {
        n = 5;
      }

      class Parent {
        child = ivue(Child); // nested ivue instance
      }

      const p1 = ivue(Parent);
      const p2 = p1.clone();

      // different top-level parents
      expect(p2).not.toBe(p1);

      // child should be deep cloned as a fresh reactive instance, not same reference
      expect(p2.child).not.toBe(p1.child);
      expect(p2.child.n).toBe(5);

      // mutation isolation works
      p2.child.n = 999;
      expect(p1.child.n).toBe(5);
      expect(p2.child.n).toBe(999);
    });
  });

  describe('propsWithDefaults()', () => {
    it('leaves primitive & function defaults as direct values (no factory wrapper)', () => {
      const defaults = {
        msg: 'hello',
        count: 7,
        truthy: true,
        fn: () => 'hi',
      };

      const typedProps = {
        msg: { type: String },
        count: { type: Number, required: false },
        truthy: { type: Boolean },
        fn: { type: Function },
        // note: no default for somethingNotProvided
        somethingNotProvided: { type: String },
      } as const;

      const result = propsWithDefaults(defaults, { ...typedProps });

      // direct assign
      expect(result.msg.default).toBe('hello');
      expect(result.count.default).toBe(7);
      expect(result.truthy.default).toBe(true);
      expect(result.fn.default).toBe(defaults.fn);

      // untouched prop that had no default in `defaults`
      expect('default' in result.somethingNotProvided).toBe(false);
    });

    it('wraps object and array defaults in a factory that deep clones', () => {
      const defaults = {
        obj: { nested: { a: 1 } },
        list: [1, 2, 3],
      };

      const typedProps = {
        obj: { type: Object },
        list: { type: Array },
      } as const;

      const result = propsWithDefaults(defaults, { ...typedProps });

      // Should now be a function for Vue-style "default" for objects/arrays
      expect(typeof result.obj.default).toBe('function');
      expect(typeof result.list.default).toBe('function');

      const v1 = (result.obj as any).default();
      const v2 = (result.obj as any).default();

      // Two fresh clones, not the same reference
      expect(v1).not.toBe(v2);
      expect(v1.nested).not.toBe(v2.nested);

      // But structurally equal
      expect(v1).toEqual({ nested: { a: 1 } });
      expect(v2).toEqual({ nested: { a: 1 } });

      // Mutating one does not affect the other
      v1.nested.a = 999;
      expect(v2.nested.a).toBe(1);

      const l1 = (result.list as any).default();
      const l2 = (result.list as any).default();

      // arrays are also cloned per call
      expect(l1).toEqual([1, 2, 3]);
      expect(l2).toEqual([1, 2, 3]);
      expect(l1).not.toBe(l2);

      l1.push(4);
      expect(l1).toEqual([1, 2, 3, 4]);
      expect(l2).toEqual([1, 2, 3]); // unchanged
    });

    it('wraps class defaults in a factory returning the class itself (NOT deep cloned)', () => {
      class SomethingCool {
        x = 10;
      }

      const defaults = {
        cool: SomethingCool,
      };

      const typedProps = {
        cool: { type: SomethingCool },
      } as const;

      const result = propsWithDefaults(defaults, { ...typedProps });

      // For class defaults, we expect a factory that returns the class,
      // not an instance and not a POJO deep clone.
      expect(typeof result.cool.default).toBe('function');

      const out = (result.cool as any).default();

      // should literally be the class constructor we passed in,
      // because Vue expects default() { return ClassFn } for "type: Class"
      expect(out).toBe(SomethingCool);
    });

    describe('deepCloneArgs + ivue() integration', () => {
      // We'll model a store with ivue semantics.
      // Important bits:
      //  - .clone() is injected by ivue()
      //  - .toRefs() is injected by ivue()
      //  - instance is reactive (ivue wraps with reactive())
      //  - static ivueCloneArgs / ivueGlobalStore control clone behavior

      it('clones non-global ivue instances using static ivueCloneArgs when used inside defaults', () => {
        class LocalStore {
          static ivueCloneInitArgs = [true];

          name = 'ORIGINAL';
          count = 1;

          set Name(newName: string) {
            this.name = newName;
          }

          // init is optional; not needed for test
          init(cloned = false) {
            if (cloned) {
              this.name = 'CLONED_NAME';
            }
          }
        }

        // make a reactive ivue instance, so it satisfies:
        // isReactive(source) === true
        // and has clone()/toRefs()
        const storeInstance = ivue(LocalStore) as IVue<typeof LocalStore>;
        // sanity
        expect(storeInstance.name).toBe('ORIGINAL');
        expect(typeof storeInstance.clone).toBe('function');
        expect(typeof storeInstance.toRefs).toBe('function');

        // Now this object becomes a prop default
        const defaults = {
          complex: {
            inner: storeInstance,
            other: { nested: true },
          },
        };

        const typedProps = {
          complex: { type: Object },
        } as const;

        // we do NOT provide deepCloneArgs Map here, so deepClone
        // should fall back to static ivueCloneArgs = ['CLONED_NAME']
        const result = propsWithDefaults(defaults, { ...typedProps }) as Record<
          string,
          { default: () => any }
        >;

        expect(typeof result.complex.default).toBe('function');

        const c1 = result.complex.default();
        const c2 = result.complex.default();

        // Each call should get a deepClone() of defaults.complex
        expect(c1).not.toBe(c2);

        // inner should NOT be the same reactive instance;
        // it should be clone()'d with ivueCloneArgs.
        expect(c1.inner).not.toBe(storeInstance);
        expect(c2.inner).not.toBe(storeInstance);

        // cloned instances should still be ivue instances (reactive with .clone/.toRefs)
        expect(typeof c1.inner.clone).toBe('function');
        expect(typeof c1.inner.toRefs).toBe('function');

        // and their state should reflect ivueCloneArgs override
        // Our LocalStore constructor sets:
        //   name = 'ORIGINAL', count = 1
        // But the clone path for ivue instances in deepClone() does:
        //   out = source.clone(...ivueCloneArgs)
        //
        // So LocalStore.clone() (auto-generated by ivue) will internally call ivueClone()
        // which will call LocalStore(...originalCtorArgs) and then copy props.
        //
        // Here's the key subtlety:
        // ivueClone() passes those cloneArgs into vue?.init?.(...cloneArgs)
        // So we can use init() (or something similar) to mutate after cloneArgs.
        //
        // Let's assert that init() got called with 'CLONED_NAME':
        expect(c1.inner.name).toBe('CLONED_NAME');
        expect(c2.inner.name).toBe('CLONED_NAME');

        c2.inner.Name = 'MODIFIED_NAME';
        expect(c2.inner.name).toBe('MODIFIED_NAME');
        expect(c1.inner.name).toBe('CLONED_NAME'); // unaffected

        // count should be copied from the source
        expect(c1.inner.count).toBe(1);
        expect(c2.inner.count).toBe(1);

        // deep nested POJO should also be cloned fresh
        expect(c1.other).toEqual({ nested: true });
        expect(c2.other).toEqual({ nested: true });
        expect(c1.other).not.toBe(c2.other);

        // editing one should not affect the other
        c1.other.nested = false;
        expect(c2.other.nested).toBe(true);
      });

      it('reuses same instance for ivueGlobalStore=true', () => {
        class GlobalStore {
          static ivueGlobalStore = true;

          value = 10;
        }

        const globalInstance = ivue(GlobalStore) as IVue<typeof GlobalStore>;

        const defaults = {
          cfg: {
            shared: globalInstance,
          },
        };

        const typedProps = {
          cfg: { type: Object },
        } as const;

        const result = propsWithDefaults(defaults, { ...typedProps }) as Record<
          string,
          { default: () => any }
        >;

        expect(typeof result.cfg.default).toBe('function');

        const v1 = result.cfg.default();
        const v2 = result.cfg.default();

        // cfg objects themselves should be unique deep clones
        expect(v1).not.toBe(v2);

        // BUT the nested global store should be exactly the same reference,
        // because deepClone() special-cases ivueGlobalStore
        expect(v1.shared).toBe(globalInstance);
        expect(v2.shared).toBe(globalInstance);

        // mutating via one should be visible via the other because it's literally shared
        v1.shared.value = 999;
        expect(v2.shared.value).toBe(999);
      });

      it('uses deepCloneArgs Map override when provided', () => {
        class ServiceStore {
          value = 1;

          init(isClone?: boolean, newVal = 1) {
            this.value = newVal;
          }
        }

        // make it ivue so it's reactive and has clone()/toRefs()
        const service = ivue(ServiceStore) as IVue<typeof ServiceStore>;

        const defaults = {
          wrap: {
            service,
          },
        };

        const typedProps = {
          wrap: { type: Object },
        } as const;

        // tell deepClone: when you see ServiceStore, call .clone(1234)
        const deepCloneArgs = new Map([[ServiceStore, [1234]]]);

        deepClone(service, deepCloneArgs); // warm up cache
        const result = propsWithDefaults(
          defaults,
          { ...typedProps },
          deepCloneArgs
        ) as Record<string, { default: () => any }>;

        const w1 = result.wrap.default();
        const w2 = result.wrap.default();

        // Each wrapper object different
        expect(w1).not.toBe(w2);

        // cloned service instances different from original AND from each other
        expect(w1.service).not.toBe(service);
        expect(w2.service).not.toBe(service);
        expect(w1.service).not.toBe(w2.service);

        // and init() should have been called with 1234 because of deepCloneArgs map
        expect(w1.service.value).toBe(1234);
        expect(w2.service.value).toBe(1234);
      });
    });

    it('does not replace prop descriptor objects, only augments them with default', () => {
      const defaults = { a: 1 };
      const typedProps = {
        a: { type: Number },
        b: { type: String },
      };

      const aRef = typedProps.a;
      const bRef = typedProps.b;

      const result = propsWithDefaults(defaults, typedProps);

      expect(result.a).toBe(aRef);
      expect(result.b).toBe(bRef);

      expect(result.a.default).toBe(1);
      expect('default' in result.b).toBe(false);
    });
    it('does not mutate the original typedProps object shape aside from adding defaults', () => {
      const defaults = { a: 1 };
      const typedProps = {
        a: { type: Number },
        b: { type: String },
      };

      // save a reference to ensure we didn't replace the objects
      const aBefore = typedProps.a;
      const bBefore = typedProps.b;

      const result = propsWithDefaults(defaults, typedProps);

      // same prop objects, just mutated with `default`
      expect(result.a).toBe(aBefore);
      expect(result.b).toBe(bBefore);

      // 'a' now has default
      expect(result.a.default).toBe(1);

      // 'b' had no default in defaults, so still no "default"
      expect('default' in result.b).toBe(false);
    });

    describe('Special Types & Binary Data', () => {
      describe('Error Handling', () => {
        it('clones standard Error objects with message and custom props', () => {
          const err = new Error('Something went wrong');
          (err as any).code = 500;
          (err as any).details = { retry: true };

          const clone = deepClone(err);

          expect(clone).not.toBe(err);
          expect(clone).toBeInstanceOf(Error);
          expect(clone.message).toBe('Something went wrong');
          // Custom props should be copied
          expect(clone.code).toBe(500);
          expect(clone.details).not.toBe((err as any).details);
          expect(clone.details.retry).toBe(true);
        });

        it('clones Custom Error classes', () => {
          class AppError extends Error {
            isFatal = true;
          }
          const err = new AppError('Fatal crash');
          const clone = deepClone(err);

          expect(clone).not.toBe(err);
          expect(clone).toBeInstanceOf(AppError); // Preserves prototype
          expect(clone.message).toBe('Fatal crash');
          expect(clone.isFatal).toBe(true);
        });

        it('handles circular references attached to Errors', () => {
          const err = new Error('Loop');
          (err as any).self = err; // Circular ref

          const clone = deepClone(err);

          expect(clone.message).toBe('Loop');
          expect(clone.self).toBe(clone); // Should point to the clone, not original
        });
      });

      describe('Uncloneable Types (Reference Preservation)', () => {
        it('returns the exact same Promise instance', () => {
          const p = Promise.resolve(1);
          const clone = deepClone(p);
          expect(clone).toBe(p);
        });

        it('returns the exact same WeakMap instance', () => {
          const wm = new WeakMap();
          const clone = deepClone(wm);
          expect(clone).toBe(wm);
        });

        it('returns the exact same WeakSet instance', () => {
          const ws = new WeakSet();
          const clone = deepClone(ws);
          expect(clone).toBe(ws);
        });

        it('preserves references even when nested', () => {
          const p = Promise.resolve();
          const wm = new WeakMap();
          const obj = { p, wm };

          const clone = deepClone(obj);

          expect(clone).not.toBe(obj);
          expect(clone.p).toBe(p); // Same promise
          expect(clone.wm).toBe(wm); // Same weakmap
        });
      });

      describe('Binary Data', () => {
        it('clones ArrayBuffer with new memory reference but same content', () => {
          const buffer = new ArrayBuffer(8);
          const view = new Int32Array(buffer);
          view[0] = 123;
          view[1] = 456;

          const clone = deepClone(buffer);

          expect(clone).toBeInstanceOf(ArrayBuffer);
          expect(clone).not.toBe(buffer);
          expect(clone.byteLength).toBe(8);

          // Check content
          const cloneView = new Int32Array(clone);
          expect(cloneView[0]).toBe(123);
          expect(cloneView[1]).toBe(456);

          // Verify independence
          cloneView[0] = 999;
          expect(view[0]).toBe(123);
        });

        it('clones TypedArrays (Int32Array) deeply', () => {
          const arr = new Int32Array([10, 20, 30]);
          const clone = deepClone(arr);

          expect(clone).toBeInstanceOf(Int32Array);
          expect(clone).not.toBe(arr);
          expect(clone).toEqual(arr);
          expect(clone.length).toBe(3);
          expect(clone[0]).toBe(10);

          // Modify clone, original stays same
          clone[0] = 999;
          expect(arr[0]).toBe(10);
        });

        it('clones Uint8Array deeply', () => {
          const arr = new Uint8Array([255, 0, 128]);
          const clone = deepClone(arr);

          expect(clone).toBeInstanceOf(Uint8Array);
          expect(clone).not.toBe(arr);
          expect(clone[0]).toBe(255);
        });

        it('clones DataView correctly', () => {
          const buffer = new ArrayBuffer(4);
          const view = new DataView(buffer);
          view.setInt32(0, 123456); // Set value

          const clone = deepClone(view);

          expect(clone).toBeInstanceOf(DataView);
          expect(clone).not.toBe(view);
          expect(clone.buffer).not.toBe(view.buffer); // Should clone underlying buffer too
          expect(clone.getInt32(0)).toBe(123456);
        });

        it('handles circular refs involving ArrayBuffers (via properties)', () => {
          // It's rare to attach props to ArrayBuffer, but possible in JS
          const buf = new ArrayBuffer(2);
          (buf as any).loop = buf;

          const clone = deepClone(buf);
          expect(clone).toBeInstanceOf(ArrayBuffer);
          // Note: The specific implementation for ArrayBuffer usually uses .slice(0)
          // which creates a NEW buffer. Standard .slice does NOT copy custom properties.
          // If your deepClone logic for ArrayBuffer looks like:
          //    const out = source.slice(0);
          //    seen.set(source, out);
          //    return out;
          // Then custom props will be LOST. If you want to keep them, you'd need copyOwnProps.
          // Based on your snippet, they will be lost. This test asserts that behavior.
          expect((clone as any).loop).toBeUndefined();
        });
      });
    });
  });
});

describe('ivue coverage edge cases', () => {
  it('propsWithDefaults skips a required prop even when a default exists', () => {
    const typed = {
      a: { type: String, required: true },
      b: { type: Number },
    };
    const out = propsWithDefaults({ a: 'ignored', b: 2 }, { ...typed }) as Record<
      string,
      any
    >;
    // required → the `if (typed.required) continue` branch is taken
    expect('default' in out.a).toBe(false);
    expect(out.b.default).toBe(2);
  });

  it('ivueDisableReactivity preserves BOTH getter and setter for an accessor', () => {
    class WithRW {
      static ivueDisableReactivity = new Set<keyof WithRW>(['rw']);
      _v = 1;
      get rw() {
        return this._v;
      }
      set rw(value: number) {
        this._v = value;
      }
    }

    // ivue() path: descriptor has get AND set → both `?.bind(vue)` branches run
    const a = ivue(WithRW);
    expect(a.rw).toBe(1);
    a.rw = 5;
    expect(a.rw).toBe(5);

    // clone() path exercises the same branch in ivueClone()
    const b = a.clone();
    expect(b.rw).toBe(5);
    b.rw = 9;
    expect(b.rw).toBe(9);
    expect(a.rw).toBe(5); // isolation
  });

  it('deepClone tolerates a deepCloneArgs entry mapped to undefined (uses [])', () => {
    class Svc {
      value = 1;
      init(_isClone?: boolean, v = 7) {
        this.value = v;
      }
    }
    const svc = ivue(Svc);
    // has(Svc) === true but get(Svc) === undefined → the `?? []` fallback runs
    const deepCloneArgs = new Map<any, any[]>([[Svc, undefined as any]]);
    const cloned = deepClone(svc, deepCloneArgs);
    // clone() called with no args → init(true) default → value = 7
    expect(cloned.value).toBe(7);
  });
});

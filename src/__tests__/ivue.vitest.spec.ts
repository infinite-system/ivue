import { describe, expect, it } from 'vitest';
import { PropType, isReactive, ref } from 'vue';

import {
  ExtractPropDefaultTypes,
  getAllClassDescriptors,
  getAllClassProperties,
  isClass,
  ivue,
  propsWithDefaults,
} from '../ivue';

class Basic {
  id = ref('id') as unknown as string;
}

class Bit {
  _testProperty = ref('test-value') as unknown as string;
  /** Setter without a getter. */
  set testProperty(value: string) {
    this._testProperty = value;
  }
}

class Item extends Bit {
  _width = ref(5) as unknown as number;
  unit = ref('px') as unknown as string;
  get width(): string {
    return this._width + this.unit;
  }
  set width(value: number) {
    this._width = value;
  }
  _height = ref(5) as unknown as number;
  get height(): string {
    return this._height + this.unit;
  }
  set height(value: number) {
    this._height = value;
  }
}

class ProductItem extends Item {
  _productType = ref('generic') as unknown as string;
  get productType() {
    return this._productType;
  }
  set productType(value) {
    this._productType = value;
  }
  _productFit = ref('perfect-fit') as unknown as string;
  get productFit() {
    return this._productFit;
  }
  _productId = ref(0) as unknown as number;
  set productId(value: number) {
    this._productId = 0;
  }
  _productFeel = ref('sleek') as unknown as string;
  public get productFeel() {
    return this._productFeel;
  }
}

class StoreItem extends ProductItem {
  _productType = ref('store') as unknown as string;
  get productType() {
    const prefix = super.productFeel ?? '';
    return (prefix ? prefix + ':' : '') + this._productType;
  }
  set productFeel(value: string) {
    this._productFeel = value;
  }
}

class RetailStoreItem extends StoreItem {
  _productType = ref('retail') as unknown as string;
  /** Do not overwrite productType getter here, on purpose. */
  productHistory = ref([]);
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
  _key = ref(0) as unknown as number;
  height = ref(0) as unknown as number;
  width = ref(0) as unknown as number;
  constructor(height: number, width = 5) {
    this.height = height;
    this.width = width;
  }
  init() {
    this._key = 5;
  }
  get key() {
    return this._key;
  }
  static ivue = {
    notComputed: false,
  };

  logNotComputedCalls() {
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
    it('getAllClassDescriptors correctly resolves all parent descriptors', () => {
      const descriptors = getAllClassDescriptors(Item);

      expect(descriptors.has('width')).toBe(true);
      expect(typeof descriptors.get('width')?.get).toBe('function');
      expect(typeof descriptors.get('width')?.set).toBe('function');

      expect(descriptors.has('height')).toBe(true);
      expect(typeof descriptors.get('height')?.get).toBe('function');
      expect(typeof descriptors.get('height')?.set).toBe('function');

      expect(descriptors.has('testProperty')).toBe(true);
      expect(typeof descriptors.get('testProperty')?.get).toBe('undefined');
      expect(typeof descriptors.get('testProperty')?.set).toBe('function');
    });

    it('getAllClassDescriptors correctly resolves all grand parent descriptors', () => {
      const descriptors = getAllClassDescriptors(ProductItem);

      expect(descriptors.has('width')).toBe(true);
      expect(typeof descriptors.get('width')?.get).toBe('function');
      expect(typeof descriptors.get('width')?.set).toBe('function');

      expect(descriptors.has('height')).toBe(true);
      expect(typeof descriptors.get('height')?.get).toBe('function');
      expect(typeof descriptors.get('height')?.set).toBe('function');

      expect(descriptors.has('testProperty')).toBe(true);
      expect(typeof descriptors.get('testProperty')?.get).toBe('undefined');
      expect(typeof descriptors.get('testProperty')?.set).toBe('function');

      expect(descriptors.has('productType')).toBe(true);
      expect(typeof descriptors.get('productType')?.get).toBe('function');
      expect(typeof descriptors.get('productType')?.set).toBe('function');

      expect(descriptors.has('productFeel')).toBe(true);
      expect(typeof descriptors.get('productFeel')?.get).toBe('function');
      expect(typeof descriptors.get('productFeel')?.set).toBe('undefined');

      expect(descriptors.has('productId')).toBe(true);
      expect(typeof descriptors.get('productId')?.get).toBe('undefined');
      expect(typeof descriptors.get('productId')?.set).toBe('function');
    });

    it('getAllClassProperties correctly resolves all parent properties', () => {
      const item = ivue(Item);
      const props = getAllClassProperties(item);

      expect(props.has('_width')).toBe(true);
      expect(props.has('_height')).toBe(true);
      expect(props.has('_testProperty')).toBe(true);
      expect(props.has('width')).toBe(true);
      expect(props.has('height')).toBe(true);
      expect(props.has('testProperty')).toBe(true);
    });

    it('getAllClassProperties correctly resolves all grand parent properties', () => {
      const item = ivue(ProductItem);
      const props = getAllClassProperties(item);

      expect(props.has('_width')).toBe(true);
      expect(props.has('_height')).toBe(true);
      expect(props.has('_testProperty')).toBe(true);
      expect(props.has('_productType')).toBe(true);
      expect(props.has('_productFit')).toBe(true);
      expect(props.has('_productId')).toBe(true);
      expect(props.has('width')).toBe(true);
      expect(props.has('height')).toBe(true);
      expect(props.has('testProperty')).toBe(true);
      expect(props.has('productType')).toBe(true);
      expect(props.has('productFit')).toBe(true);
      expect(props.has('productId')).toBe(true);
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

    it('parent getters from the prototype chain are working', () => {
      const item = ivue(RetailStoreItem);

      expect(item.productType).toBe('sleek:retail');
    });

    it('parent setters from the prototype chain are working', () => {
      const item = ivue(RetailStoreItem);

      expect(item.productType).toBe('sleek:retail');
      /** SET VIA SETTER */
      // @ts-expect-error ivue supports setting set and get separately in different levels of class prototype chain
      item.productType = 'new-retail';
      expect(item.productType).toBe('sleek:new-retail');
    });

    it('parent setters that are set at different levels in the prototype chain work together in harmony', () => {
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

    it('parent setters are working even without getters', () => {
      const item = ivue(RetailStoreItem);

      expect(item._testProperty).toBe('test-value');
      /** SET VIA SETTER */
      // @ts-expect-error ivue supports setting set and get separately in different levels of class prototype chain
      item.testProperty = 'new-test-value';
      expect(item._testProperty).toBe('new-test-value');
    });
  });

  describe('ivue toRefs conversion', () => {
    it('toRefs all properties', () => {
      const { _height, _width, height, width, calculateSize } =
        ivue(RetailStoreItem).toRefs();

      expect(_height.value).toBe(5);
      expect(_width.value).toBe(5);
      expect(height.value).toBe('5px');
      expect(width.value).toBe('5px');
      expect(calculateSize()).toBe(10);
    });

    it('toRefs all properties with pre-calculated computeds', () => {
      const item = ivue(RetailStoreItem);

      /** Access computeds to pre-calculate them before toRefs() */
      item.height;
      item.width;

      const { height, width, calculateSize } = item.toRefs();

      expect(height.value).toBe('5px');
      expect(width.value).toBe('5px');
      expect(calculateSize()).toBe(10);
    });

    it("toRefs(['prop', ...]) specific properties", () => {
      const item = ivue(ProductItem);

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
      const { calculateSize } = ivue(RetailStoreItem).toRefs(['calculateSize']);

      expect(calculateSize()).toBe(10);
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

  describe('util functions', () => {
    it('isClass correctly determines if a value is a class', () => {
      expect(isClass('string')).toBe(false);
      expect(isClass(10)).toBe(false);
      expect(isClass(null)).toBe(false);
      expect(isClass(() => {})).toBe(false);
      expect(isClass(function () {})).toBe(false);
      expect(
        isClass(
          class {
            prop = 1;
          }
        )
      ).toBe(true);
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
        updateFieldsParams: { // Object
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
      expect(isClass((_propsWithDefaults.runner.default as () => any)())).toBe(
        true
      );
      
      // Function
      expect(_propsWithDefaults.fn.default).toBeTypeOf('function');
      expect(isClass((_propsWithDefaults.fn.default as () => any)())).toBe(
        false
      );
    });
  });
});

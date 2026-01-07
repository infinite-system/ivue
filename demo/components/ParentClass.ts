import { computed as $, ref, watch } from 'vue';
import { Reactive } from '../../lib/Reactive';
import { GrandParent } from './GrandParentClass';
import { test } from './ChildClass';

export const parentSomething = ref('parent something!');

export const something = ref(1234);

class $Parent extends GrandParent.$Class {
  // variable = ref('parent variableas');

  constructor() {
    super();
    // this.init();
  }

  init() {
    watch(this.parentValue, this.onWatchParentValue);
  }

  get value() {
    return ref(42);
  }

  get test() {
    return test;
  }

  get area() {
    return $(
      () =>
        this.value.value * 2 +
        ' xxx!! ' +
        '[' +
        (super.area.value + super.area.value) +
        ']'
    );
  }

  get amazing() {
    return $(() => 'amazing ' + this.area.value + ' !!!');
  }

  get parentValue() {
    return ref('parent value');
  }

  update() {
    super.update();
    this.test.value.value.value = Math.random() * 100;
    this.something.value = Math.random() * 1000;
    this.parentValue.value = 'PARENT VALUE!!: ' + Math.random();
  }

  onWatchParentValue(v: any) {
    alert('Parent Value: ' + v);
  }

  get inheritTest() {
    return super.inheritTest + ' + extended in Parent';
  }
}

export namespace Parent {
  export const $Class = $Parent;
  export const Class = Reactive($Parent);
  export type Instance = typeof Class.Instance;
}

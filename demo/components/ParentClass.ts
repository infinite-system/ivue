import { computed, ref } from 'vue';
import { Reactive } from '../../lib/Reactive';
import { GrandParent } from './GrandParentClass';
import { test } from './UseItemClass';


export const parentSomething = ref('parent something!');

export const something = ref(1234);

class $Parent extends GrandParent.$Class {

  variable = ref('parent variableas');
  get value() {
    return ref(42);
  }

  get test() {
    return test;
  }

  get area() {
    return computed(
      () =>
        this.value.value * 2 +
        ' xxx!! ' +
        '[' +
        (super.area.value + super.area.value) +
        ']'
    );
  }

  get parentValue() {
    return ref('parent value');
  }

  update() {
    super.update();
    this.test.value.value.value = Math.random() * 100;
    this.parentValue.value = 'PARENT VALUE!!: ' + Math.random();
  }


  createNewAlert(v: number) {
    alert('Parent Alert Height Changed: ' + v);
  }
}

export namespace Parent {
  // Raw class
  export const $Class = $Parent;
  export type $Instance = InstanceType<typeof $Class>;
  export type $Constructor = typeof $Class;
  
  // Reactive class
  export const Class = Reactive($Parent);
  export type Instance = typeof Class.Instance;
  export type Constructor = typeof Class;
}

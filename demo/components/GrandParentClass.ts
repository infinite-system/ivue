import { computed, ref } from 'vue';
import { Reactive } from '../../lib/Reactive';

import { something } from './ParentClass';
import { test2 } from './UseItemClass'; 


class $GrandParent {
  get something() {
    return something;
  }

  get test2() {
    return test2;
  }

  get grandValue() {
    return ref(7);
  }

  get awesomeValue() {
    return ref('awesome');
  }
  get area() {
    return computed(() => {
      return this.grandValue.value * 3 + ' grand';
    });
  }
  update() {
    this.awesomeValue.value = 'GRAND AWESOME ' + Math.random();
  }

  get inheritTest() { 
    return 'inherited from GrandParent';
  }
}

export namespace GrandParent {
  // Raw class
  export const $Class = $GrandParent;
  export type $Instance = InstanceType<typeof $Class>;
  
  // Reactive class
  export const Class = Reactive($GrandParent);
  export type Instance = typeof Class.Instance;
}

// hosted.ts — run a class constructor INSIDE a component's setup.
//
// An ivue constructor is setup code: `onMounted`, `onBeforeUnmount` and a
// plain `watch` land in the component that constructs the instance. A bare
// `new X.Class()` in a test has no component, so the hooks warn and drop,
// and a spec that reads "mounted" state would be proving nothing. This
// harness mounts a throwaway component whose setup is the factory, so
// every hook registers against a real instance and unmount runs the
// teardown the class declares — the same lifecycle the SFC gives it.
//
// Use it for any class whose constructor touches the lifecycle. A class
// with no hooks (a pure Static class, a hosted capability constructed by
// its owner) is constructed directly.
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';

export function hosted<T>(factory: () => T): { instance: T; unmount: () => void } {
  let instance!: T;
  const wrapper = mount(
    defineComponent({
      setup() {
        instance = factory();
        return () => h('div');
      }
    })
  );
  return { instance, unmount: () => wrapper.unmount() };
}

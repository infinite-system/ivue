<script setup lang="ts">
import CounterBasic from '../components/examples/CounterBasic.vue'
</script>
# How it works?

To understand how ivue works, it is important to understand, how it does not work.

## How it does NOT work?

::: info `ivue` is different from other class based libraries
&mdash; &nbsp;`ivue` does NOT inherit from a base class<br />
&mdash; &nbsp;`ivue` does NOT use decorators to achieve its objectives<br />
&mdash; &nbsp;`ivue` does NOT alter Vue 3 underlying behavior, but rather relies on it<br />
&mdash; &nbsp;`ivue` is NOT the same as class components (though you can build components with it)
:::

## How it works?

### `ivue` has a simple approach:

&mdash; &nbsp;`ivue` mimicks native JavaScript / TypeScript class implementation by extending descriptors (getters and setters) up the whole prototype chain thus supporting classical inheritance.

&mdash; &nbsp;By using TypeScript we are able to infer the arguments of the main `ivue` initializer function and pass the arguments to the constructor.

&mdash; &nbsp;`ivue` initializer function returns an extended Vue 3 `reactive()` object with getters internally converted to computeds and adds `.toRefs()` method to the object. Computeds auto-unwrap themselves when they are accessed as a reactive object, so the `.value` gets flattened into the final object.

&mdash; &nbsp;`ivue` recommends all props to be defined as `ref()` to be able to interoperate with `defineExpose()`, if you simply pass reactive props which are not Refs through `defineExpose()`, they will lose reactivity. `ref()` refs like computed refs get flattened into the `reactive()` object, so there is no need to worry about using `.value` here either. The `ref()` refs are necessary just internally for Vue 3 to know which refs to keep reactive, and we just convert the types back to their normal types as if they have no reactivity at all, so `Ref<number>` is `number` in `ivue`, so rather than going in the direction of complexifying the types, we are going inte opposite direction of simplification.

&mdash; &nbsp;`.toRefs()` allows the object to be converted to native composable structure with full `.value`, so it can interoperate as a composable if needed.

&mdash; &nbsp;`ivue` aims to be opaque and minimal, just doing the minimum to convert a class to a reactive object, leaving the rest to be implemented using Vue 3 Composition API inside an initializer function called `.init()` 


### Classic Counter example built with `ivue`
<<< @/components/examples/CounterBasic.vue

<CounterBasic />
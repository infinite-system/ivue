<script setup lang="ts">
import CounterBasic from '../components/examples/CounterBasic.vue'
</script>
# How it works?

## What ivue is NOT?

To understand how ivue works and how it does it, it is important to understand what it does not do.

::: info `ivue` is different from other class based libraries
&mdash; &nbsp;`ivue` does NOT inherit from a base class<br />
&mdash; &nbsp;`ivue` does NOT use decorators to achieve its objectives<br />
&mdash; &nbsp;`ivue` does NOT alter Vue 3 underlying behavior, but rather relies on it<br />
&mdash; &nbsp;`ivue` is NOT the same as class components (though you can build components with it)
:::

## How it works?
```ts
export function ivue<T extends AnyClass>(
  className: T,
  ...args: InferredArgs<T>
): IVue<T> 
```
The main `ivue()` initializer function uses TypeScript to be able to infer and validate the constrcutor argument types of `AnyClass` and passes those arguments to the constructor of `AnyClass`.

`ivue` allows you to pass any number of arguments into the class `constructor(arg1, arg2, arg3, ...etc)`

`ivue()` initializer function returns an extended Vue 3 `reactive()` object in which getters and setters are internally converted to computeds and adds `.toRefs()` method to the created object. Computeds auto-unwrap themselves when they are accessed as a reactive object property, so the `.value` properties and computeds get flattened in the resulting object and do not require `.value` to be accessed.

`ivue` replicates native JavaScript / TypeScript class implementation by extending descriptors (getters and setters) up the whole prototype chain thus supporting classical inheritance.

`ivue` aims to be opaque and minimal, just doing the minimum to convert a class to a reactive object, leaving the rest to be implemented using Vue 3 Composition API inside an initializer function called `.init()` 

## Usage Recommendation
`ivue` recommends all class properties to be defined as `ref()` to be able to interoperate with `defineExpose()`, if you simply pass reactive props which are not Refs through `defineExpose()`, they will lose reactivity. `ref()` refs just like computed refs get flattened into the `reactive()` object, so there is no need to worry about using `.value`. The `ref()` refs are necessary just internally for Vue 3 to know which refs to keep reactive, and we just convert the types back to their normal types as if they have no reactivity at all, so `Ref<number>` is `number` in `ivue`, so rather than going in the direction of complexifying the types, we are going in the opposite direction towards simplification.

`ivue` recommends all class functions, getters and setters to be defined in plain full function style (not arrow functions), this allows all `ivue` classes to be extensible at any point. By using plain standard functions, getters and setters allows for any getter, setter, function or property to be overriden by extending this class. Arrow functions break full extensibility of classes, so avoid using them inside of classes.

## Minimal API Surface Area

`ivue()` initializer function is the main API<br />
`.init()` method helps initialize the reactive state like `watch`, `onMount`, etc.<br />
`.toRefs()` method allows to interoperate with Vue 3 Composables<br />
Utility Types help to achieve the rest of `ivue` capabilities

:::details Click to see the whole latest `ivue` source code from github main branch below:
:::code-group
<<< ../../../src/index.ts{ts:line-numbers} [ivue.ts]
:::
Or [See on GitHub](https://github.com/infinite-system/ivue/blob/main/src/index.ts)

## 100% Vue 3 Compatible
`.toRefs()` allows the object to be converted to native composable structure with full `.value`s, so it can interoperate with native composables if needed. `.toRefs()` is also often used to get refs for `v-bind()` in css styles.

## 100% TypeScript Support

`ivue` is on the cutting edge of TypeScript and owes its capabilities to the latest developments in TypeScript. 

`ivue` provides a set of utility types to make working with `Vue 3` even easier and more scalable.

## 100% Unit Tested Architecture

At the current stage all of the code that is used to build `ivue` is 100% tested with 100% coverage, and aims to keep being at 100% always.

You can clone the project and run `yarn test` yourself and examine the tests.

## Zero Dependencies

`ivue` has zero dependencies except Vue 3.
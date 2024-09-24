<script setup lang="ts">
import Button from '@/components/Button.vue'
import Infin from '@/components/Infin.vue'
</script>

# What is Infinite Vue?

## <div style="padding:0px 0 5px 0; display:inline-block; vertical-align:middle;"><img src="/ivue-logo.png" alt="ivue" width="90" /></div> &nbsp;is
<div style="padding-left: 5px; font-size: 17px; line-height: 28px; " class="q-gutter-y-sm">
  <div class="row">
    <Infin /><div class="col">an OOP Reactivity System for Vue 3</div>
  </div>
  <div class="row">
    <Infin /><div class="col">Simple like Options API</div>
  </div>
  <div class="row">
    <Infin /><div class="col">Flexible like Composition API</div>
  </div>
  <div class="row">
    <Infin /><div class="col">Extensible like TypeScript Class API</div>
  </div>
  <div class="row">
    <Infin /><div class="col">Robust, Minimal, Opaque & Powerful</div>
  </div>
  <div class="row">
    <Infin /><div class="col">100% VSCode / Intellij IDE Support</div>
  </div>
  <div class="row">
    <Infin /><div class="col">100% Vue 3 Compatible</div>
  </div>
  <div class="row">
    <Infin /><div class="col">100% Test Covered</div>
  </div>
  <div class="row">
    <Infin /><div class="col">100% Type Safe</div>
  </div>
  <div class="row">
    <Infin /><div class="col">Production Ready</div>
  </div>
  <div class="row">
    <Infin /><div class="col">Just <strong>1.1kb</strong> gzipped!</div>
  </div>
  <div class="row">
    <Infin /><div class="col">Zero dependencies, only Vue 3 needed!</div>
  </div>
</div>

*ivue* gives you class based reactivity with encapsulation, inheritance, and polymorphism of JavaScript Classes. 

*ivue* mitigates the downsides of Composition API, Options API and Native Class API.

*ivue* works with Vue 3 Composition API composables, including *VueUse* or any composable implementations.

*ivue* omits implementing IOC Container, Decorators, Mixins, etc. by design to keep it lean and maintainable.

*ivue* enforces a sane default standard of operation to contain the ever flexible Class API.

*ivue* uses cutting edge TypeScript to unwrap Vue 3 Refs, infer Class constructor arguments, infer unwrapped Composable return types making Object Oriented DX Experience with Vue 3 simple.


## The Problem

With the development of React hooks and Vue following in its footsteps with introduction of Vue 3 Composition API, the ecosystem has moved away from Options API. 

While providing greater flexibility and composability the Composition API has its own downsides, one of them is having to use *.value* to refer to the reactive variables which makes the development process more clunky when the App or a certain Vue component reaches a certain size. 

As you may know, *reactvity-transform* macros were an attempt to mitigate issues relating to *.value*, which turned out to create even more issues, and was discontinued. 

See [VueJs.org &ndash; Reactivity Transform](https://vuejs.org/guide/extras/reactivity-transform.html).

## OOP and Class Based Reactivity in the Ecosystem

Class-based architectures in JavaScript, especially in earlier versions of React and Vue, became problematic due to issues with state management, lifecycle methods, and context binding (this). The community moved toward functional programming to reduce these complexities.

However, object-oriented programming (OOP) still offers advantages, such as encapsulation, inheritance, and polymorphism, which are appealing in large-scale applications. The challenge has always been how to leverage these strengths without incurring the issues mentioned above.

## <div style="padding:0px 0 5px 0; display:inline-block; vertical-align:middle;"><img src="/ivue-logo.png" alt="ivue" width="90" /></div> &nbsp;is different

∞&nbsp; *ivue* does NOT inherit from a base Class.<br />
∞&nbsp; *ivue* does NOT use Decorators to achieve its objectives.<br />
∞&nbsp; *ivue* does NOT alter Vue 3 underlying behavior, but relies on it.<br />
∞&nbsp; *ivue* does NOT behave like Class Components, though you can build components with it.<br />


::: tip IVUE IMPLEMENTS MINIMAL API ARCHITECTURE
Things like IOC Container, Decorators, Traits, Mixins, etc. were omitted by design to slim down the surface area and scope of *ivue* core purpose, which is JavaScript / TypeScript Class API based reactivity. Any Traits, Decorators, Mixins & IOC Container can be built around it using third-party libraries or roll your own systems. You are more than welcome to contribute in this area.
:::



## Reactive Class Architecture

*ivue* replicates native JavaScript / TypeScript class implementation by extending descriptors (getters and setters) up the whole ancestors prototype chain thus supporting classical inheritance.

By using TypeScript we are able to infer the arguments of the main *ivue()* initializer function and pass those arguments to the constructor.

*ivue()* initializer function returns a *reactive()* object with getters converted to computeds and adds *.toRefs()* method to the object, *.toRefs()* allows the object to be converted to native composable structure, so it can interoperate as a composable if needed.

*ivue* aims to be opaque and minimal, just doing the minimum to convert a class to a reactive object, leaving the rest to be implemented using Vue 3 Composition API inside an initializer function called *.init()*

You can read more about *ivue* internal architecture in <Button href="/pages/how-it-works" label="How it works?" /> page.



## Minimal API Surface Area

`ivue()` initializer function is the main core function to initialize the *ivue* reactive object<br />
`iref()` ref initializer instantiates the Ref but Unwraps its type as the raw type of the Ref<br />
`iuse()` function converts the type of composables to they Unwraped raw types<br />
`.init()` method helps initialize the reactive state like `watch`, `onMount`, etc.<br />
`.toRefs()` method allows to interoperate with Vue 3 Composables<br />
Utility Types help to achieve the rest of *ivue* capabilities

:::details Click to see the whole latest *ivue* source code from github main branch below:
:::code-group
<<< ../../../lib/ivue.ts{ts:line-numbers} [ivue.ts]
:::
Or [See on GitHub](https://github.com/infinite-system/ivue/blob/main/lib/ivue.ts)

## 100% Vue 3 Compatible

*.toRefs()* allows the object to be converted to Vue 3 native composable structure with full *.value*, so it can interoperate with native composables if needed. *.toRefs()* is also often used to get refs for *v-bind()* in css styles.

## 100% TypeScript Support

*ivue* is on the cutting edge of TypeScript and owes its capabilities to the latest developments in TypeScript.

*ivue* provides a set of utility types to make working with Vue 3 even easier and more scalable.

## 100% Test Coverage

At the current stage all of the code that is used to build *ivue* is 100% tested with 100% coverage, and aims to keep being at 100% always.

You can clone the project and run `yarn test` yourself and examine the tests.

## Zero Dependencies

*ivue* has zero dependencies except Vue 3.


## When to use Infinite Vue?

When the complexity of your app or components becomes very high using *ivue* can become a natural choice to deal with that complexity. Because *.value* is abstracted away in *ivue*, everything is simply a reactive object of Refs.

<style>
</style>